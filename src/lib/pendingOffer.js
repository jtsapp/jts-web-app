// Тариф, выбранный на странице тарифов сайта (/info/tariffs → «Купить»).
//
// Ссылка ведёт на ?screen=pricing&offer=<код>, но гостю до оплаты надо войти, а
// адрес к тому времени уже вычищен. Поэтому код лежит в sessionStorage вкладки,
// пока витрина не положит его в корзину, — один раз: иначе тариф возвращался бы
// в корзину на каждом заходе.

const KEY = 'jts_pending_offer'
const CODE = /^[A-Za-z0-9_-]{1,64}$/

export function rememberPendingOffer(code) {
  if (typeof code !== 'string' || !CODE.test(code)) return
  try {
    window.sessionStorage.setItem(KEY, code)
  } catch {
    /* приватный режим — тариф просто не подставится */
  }
}

export function consumePendingOffer() {
  try {
    const code = window.sessionStorage.getItem(KEY)
    window.sessionStorage.removeItem(KEY)
    return code && CODE.test(code) ? code : null
  } catch {
    return null
  }
}
