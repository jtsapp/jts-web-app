// Group enrollment and channel settings return business messages, while matching uses its own coded errors.
export function serverActionError(error, translate) {
  return error?.serverMessage || translate('error.generic')
}
