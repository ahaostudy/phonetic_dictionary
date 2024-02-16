import CryptoJS from 'crypto-js'
import { jsonp } from '../api/index.js'

export function translate(appID, appSecret, text) {
  const appKey = appID
  const key = appSecret
  const salt = (new Date).getTime()
  const curtime = Math.round(new Date().getTime() / 1000)
  const query = text
  const from = 'en'
  const to = 'zh-CHS'
  const str = appKey + truncate(query) + salt + curtime + key

  const sign = CryptoJS.SHA256(str).toString(CryptoJS.enc.Hex)
  return jsonp(
    'https://openapi.youdao.com/api',
    {
      q: query,
      appKey: appKey,
      salt: salt,
      from: from,
      to: to,
      sign: sign,
      signType: 'v3',
      curtime: curtime
    }
  )
}

function truncate(q) {
  let len = q.length
  if (len <= 20) return q
  return q.substring(0, 10) + len + q.substring(len - 10, len)
}
