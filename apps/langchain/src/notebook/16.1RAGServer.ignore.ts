import express from 'express'
import RAG from './16.0RAG'

const app = express()
const port = 8080

app.use(express.json())

app.post('/', async (req, res) => {
  const rag = new RAG()
  const ragChain = await rag.ragChainWithHistory()
  const body = req.body
  const result = await ragChain.stream(
    {
      question: body.question,
    },
    { configurable: { sessionId: body.session_id } },
  )

  res.set('Content-Type', 'text/plain')
  for await (const chunk of result) {
    res.write(chunk)
  }
  res.end()
})

app.listen(port, () => {
  console.log(`RAG Server is running on port ${port}`)
})
