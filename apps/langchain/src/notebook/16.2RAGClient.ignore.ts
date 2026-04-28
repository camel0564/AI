const port = 8080

async function fetchStream() {
  const response = await fetch(`http://localhost:${port}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      question: '桑桑的爸爸是谁?',
      session_id: 'caofangzi-test-server',
    }),
  })
  if (!response.body) {
    return console.log('🚀 404', response)
  }
  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done)
      break
    console.log(decoder.decode(value))
  }

  console.log('Stream has ended')
}

fetchStream()
