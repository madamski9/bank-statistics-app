package com.bankstats.ingestion

import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import java.io.ByteArrayOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.File
import java.security.KeyStore
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class OutboxKeyStore(private val keyFile: File, private val alias: String) {
  fun loadOrCreate(): ByteArray =
    try {
      if (keyFile.exists()) unwrap(keyFile.readBytes()) else create()
    } catch (error: IngestionException) {
      throw error
    } catch (error: Exception) {
      throw IngestionException.Keystore(error)
    }

  private fun create(): ByteArray {
    val key = ByteArray(KEY_LENGTH).also { SecureRandom().nextBytes(it) }
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, wrappingKey())
    val sealed = ByteArrayOutputStream().also { buffer ->
      DataOutputStream(buffer).use { output ->
        output.writeInt(FORMAT_VERSION)
        output.writeInt(cipher.iv.size)
        output.write(cipher.iv)
        output.write(cipher.doFinal(key))
      }
    }.toByteArray()
    val pending = File(keyFile.parentFile, "${keyFile.name}.pending")
    keyFile.parentFile?.mkdirs()
    pending.writeBytes(sealed)

    if (!pending.renameTo(keyFile)) {
      pending.delete()
      throw IllegalStateException("The outbox key could not be stored")
    }

    return key
  }

  private fun unwrap(sealed: ByteArray): ByteArray {
    val input = DataInputStream(sealed.inputStream())
    val version = input.readInt()

    if (version != FORMAT_VERSION) {
      throw IllegalStateException("Unsupported outbox key format $version")
    }

    val iv = ByteArray(input.readInt()).also { input.readFully(it) }
    val ciphertext = input.readBytes()
    val keyStore = KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }
    val wrappingKey = keyStore.getKey(alias, null) as? SecretKey
      ?: throw IllegalStateException("The Keystore key protecting the outbox is missing")
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.DECRYPT_MODE, wrappingKey, GCMParameterSpec(TAG_LENGTH_BITS, iv))
    return cipher.doFinal(ciphertext)
  }

  private fun wrappingKey(): SecretKey {
    val keyStore = KeyStore.getInstance(ANDROID_KEY_STORE).apply { load(null) }
    (keyStore.getKey(alias, null) as? SecretKey)?.let { return it }

    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEY_STORE)
    generator.init(
      KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256)
        .build()
    )
    return generator.generateKey()
  }

  private companion object {
    const val ANDROID_KEY_STORE = "AndroidKeyStore"
    const val TRANSFORMATION = "AES/GCM/NoPadding"
    const val TAG_LENGTH_BITS = 128
    const val KEY_LENGTH = 32
    const val FORMAT_VERSION = 1
  }
}
