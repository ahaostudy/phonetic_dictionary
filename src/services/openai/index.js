import { post } from '../api/index.js'

export function speechAPI(baseUrl, apiKey, input, speed) {
  return post(baseUrl + '/v1/audio/speech',
    {
      model: 'tts-1',
      voice: 'alloy',
      response_format: 'mp3',
      input,
      speed
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      responseType: 'arraybuffer'
    })
}