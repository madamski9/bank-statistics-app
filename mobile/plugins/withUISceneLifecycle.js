const fs = require('fs');
const path = require('path');
const { withInfoPlist, withAppDelegate, withXcodeProject, IOSConfig } = require('@expo/config-plugins');

const SCENE_DELEGATE_SOURCE = `import React
import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: appDelegate.launchOptions)

    if let urlContext = connectionOptions.urlContexts.first {
      RCTLinkingManager.application(UIApplication.shared, open: urlContext.url, options: [:])
    }
    if let userActivity = connectionOptions.userActivities.first {
      RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url else { return }
    RCTLinkingManager.application(UIApplication.shared, open: url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    RCTLinkingManager.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

function withSceneManifestInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });
}

function withSceneLifecycleAppDelegate(config) {
  return withAppDelegate(config, (config) => {
    const anchor = `    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)`;

    const replacement = `    reactNativeDelegate = delegate
    reactNativeFactory = factory
    self.launchOptions = launchOptions

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)`;

    if (!config.modResults.contents.includes(anchor)) {
      throw new Error(
        'withUISceneLifecycle: AppDelegate.swift template has changed — could not find the expected ' +
          'didFinishLaunchingWithOptions body to patch for UIScene lifecycle support.'
      );
    }
    config.modResults.contents = config.modResults.contents.replace(anchor, replacement);

    const propertyAnchor = '  var reactNativeFactory: RCTReactNativeFactory?';
    if (!config.modResults.contents.includes(propertyAnchor)) {
      throw new Error(
        'withUISceneLifecycle: AppDelegate.swift template has changed — could not find reactNativeFactory property to patch.'
      );
    }
    config.modResults.contents = config.modResults.contents.replace(
      propertyAnchor,
      `${propertyAnchor}\n  var launchOptions: [UIApplication.LaunchOptionsKey: Any]?`
    );

    return config;
  });
}

function withSceneDelegateXcodeProject(config) {
  return withXcodeProject(config, (config) => {
    const platformProjectRoot = config.modRequest.platformProjectRoot;
    const projectName = IOSConfig.XcodeUtils.getHackyProjectName(config.modRequest.projectRoot, config);

    const filePath = path.join(platformProjectRoot, projectName, 'SceneDelegate.swift');
    fs.writeFileSync(filePath, SCENE_DELEGATE_SOURCE);

    const project = config.modResults;
    const target = IOSConfig.XcodeUtils.getApplicationNativeTarget({ project, projectName });

    IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
      filepath: `${projectName}/SceneDelegate.swift`,
      groupName: projectName,
      project,
      targetUuid: target.uuid,
    });

    return config;
  });
}

module.exports = function withUISceneLifecycle(config) {
  config = withSceneManifestInfoPlist(config);
  config = withSceneLifecycleAppDelegate(config);
  config = withSceneDelegateXcodeProject(config);
  return config;
};
