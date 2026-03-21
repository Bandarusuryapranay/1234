import axios from 'axios'

const URL = process.env.PISTON_API_URL || 'http://localhost:2000'

export async function runTestCases(params: {
  sourceCode: string, language: string, testCases: any[]
}) {
  const promises = params.testCases.map(async (tc, i) => {
    try {
      // Use the custom HF format revealed in Postman: { language, code }
      const { data } = await axios.post(`${URL}/execute`, {
        language: params.language.toLowerCase(),
        code: params.sourceCode,
        stdin: tc.input || ''
      }, { timeout: 25000 }) // Increase timeout to 25s for slow languages like Python/Java
      
      const actual = (data.output || '').trim()
      const expected = (tc.expectedOutput || '').trim()
      
      return {
        caseIndex: i,
        passed: actual === expected,
        actualOutput: actual,
        isHidden: tc.isHidden
      }
    } catch (err: any) {
      console.error(`Execution failed for Case ${i}:`, err.message)
      return {
        caseIndex: i,
        passed: false,
        actualOutput: `Error: ${err.message}`,
        isHidden: tc.isHidden
      }
    }
  })

  const results = await Promise.all(promises)
  const passedCount = results.filter(r => r.passed).length
  return { results, passed: passedCount, total: results.length }
}