import { expect, it } from 'vitest'
import { getWeatherApi } from './weather.js'

it('测试天气API', async () => {
  const res = await getWeatherApi({ latitude: 31.25, longitude: 121.5 })
  expect(res.current).toBeDefined()
})
