/**
 * 按字符串长度动态计算 max_tokens
 * 核心逻辑：min(max(300, 字符串长度//3), 4000)
 * @param inputText 输入文本
 */
function autoMaxTokens(inputText: string) {
  // 1. 获取输入文本的字符串长度（替代 tokens 计算）
  const inputLength = inputText.length

  // 2. 核心逻辑：和 Python 等价（// 对应 Math.floor 整数除法）
  const baseValue = Math.floor(inputLength / 3) // 对应 input_tokens // 3
  const dynamicValue = Math.max(300, baseValue) // 最低 300
  const finalMaxTokens = Math.min(dynamicValue, 4000) // 最高 4000

  return {
    /** 最大输出 token 数 */
    max_tokens: finalMaxTokens,
    /** 兼容: openai o系列推理模型 */
    max_completion_tokens: finalMaxTokens,
  }
}
