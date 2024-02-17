import { post } from '../api/index.js'

export function speechAPI(baseUrl, apiKey, input, speed, voice) {
  return post(baseUrl + '/v1/audio/speech',
    {
      model: 'tts-1',
      response_format: 'mp3',
      input,
      speed,
      voice
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + apiKey
      },
      responseType: 'arraybuffer'
    })
}