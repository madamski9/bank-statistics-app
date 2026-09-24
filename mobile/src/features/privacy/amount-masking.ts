const hiddenDigits = '•••';
const digitRun = /[0-9](?:[0-9,.]|[  ](?=[0-9]))*/g;

export function maskAmountLabel(label: string): string {
  return label.replace(digitRun, hiddenDigits);
}
