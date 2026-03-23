// ── DSA Topics ─────────────────────────────────────────────────
export const DSA_TOPICS = {
  arrays_strings: ['Arrays', 'Strings', 'Two Pointers', 'Sliding Window', 'Prefix Sum'],
  linked_list:    ['Singly Linked List', 'Doubly Linked List', 'Fast & Slow Pointers', 'Merge Lists', 'Cycle Detection'],
  trees_graphs:   ['Binary Tree', 'Binary Search Tree', 'BFS', 'DFS', 'Graph Traversal', 'Topological Sort'],
  dynamic_prog:   ['Fibonacci / Memoization', 'Knapsack', 'Longest Common Subsequence', 'Coin Change', 'Matrix DP'],
  sorting_search: ['Binary Search', 'Merge Sort', 'Quick Sort', 'Search in Rotated Array'],
  stack_queue:    ['Stack', 'Queue', 'Monotonic Stack', 'Priority Queue / Heap'],
  recursion:      ['Backtracking', 'Permutations & Combinations', 'N-Queens', 'Subset Sum'],
  math:           ['Prime Numbers', 'GCD / LCM', 'Bit Manipulation', 'Modular Arithmetic'],
}

export type DSATopicKey = keyof typeof DSA_TOPICS

// ── JD-Based Coding Prompt ─────────────────────────────────────
export function codingPrompt(jd: string, role: string, cfg: any): string {
  const total = Math.ceil((cfg.problemCount || 2) * 2.5)
  const langs = (cfg.allowedLanguages || ['javascript', 'python']).join(', ')

  return `You are a LeetCode problem setter creating coding problems for a ${role} role interview.

JOB DESCRIPTION:
${jd}

Generate exactly ${total} coding problems directly relevant to the tech stack in the JD, in authentic LeetCode style.
Difficulty split: ${cfg.difficultyEasy || 0}% Easy, ${cfg.difficultyMedium || 50}% Medium, ${cfg.difficultyHard || 50}% Hard.

RELEVANCE RULES:
- Problems must test real skills from the JD (e.g. if JD mentions React → test component logic / state management; if SQL → test query optimisation; if Node.js → test async patterns / data transformation)
- Frame problems as realistic engineering tasks, not abstract puzzles
- Use domain-appropriate variable names (e.g. for a backend role: orders, users, transactions — not arr, nums)

LEETCODE STYLE RULES — every problem must follow all of these:
1. Problem statement in clear prose — describe the engineering scenario first, then the task
2. Use proper function name relevant to the domain (e.g. findDuplicateOrders, groupUsersByRegion)
3. Examples must label each parameter by name, show exact output, and explain WHY step by step
4. Constraints: input size range, value range, time complexity expectation, any domain constraints
5. Starter code must have JSDoc/@param/@return with domain-relevant parameter names
6. Test cases: 2 visible + 3 hidden edge cases (empty input, single item, large n, boundary values)
7. NEVER generate trivial problems — every problem must require algorithmic thinking

Respond ONLY with valid JSON — no markdown, no explanation:
{
  "problems": [
    {
      "type": "CODING",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "topicTag": "e.g. Hash Map · Graph Traversal · String Parsing",
      "problemTitle": "Domain-relevant title e.g. Group Anagram Log Entries",
      "problemStatement": "Full LeetCode-style prose. Describe the engineering scenario. Use backticks for variable names. End with: Return [exact description].",
      "constraints": "- 1 <= logs.length <= 10^5\\n- Each log entry is a non-empty string\\n- Expected: O(n log n) time",
      "examples": [
        {
          "input": "logs = [\\"eat\\",\\"tea\\",\\"tan\\",\\"ate\\",\\"nat\\",\\"bat\\"]",
          "output": "[[\\"bat\\"],[\\"nat\\",\\"tan\\"],[\\"ate\\",\\"eat\\",\\"tea\\"]]",
          "explanation": "Step-by-step: sort each word → use as key → group words with same key."
        }
      ],
      "testCases": [
        { "input": "[\\"eat\\",\\"tea\\",\\"tan\\"]", "expectedOutput": "[[\\"tan\\"],[\\"eat\\",\\"tea\\"]]", "isHidden": false },
        { "input": "[\\"\\"]", "expectedOutput": "[[\\"\\"]]", "isHidden": false },
        { "input": "[\\"a\\"]", "expectedOutput": "[[\\"a\\"]]", "isHidden": true },
        { "input": "[\\"ab\\",\\"ba\\",\\"abc\\",\\"bca\\",\\"cab\\"]", "expectedOutput": "[[\\"ab\\",\\"ba\\"],[\\"abc\\",\\"bca\\",\\"cab\\"]]", "isHidden": true },
        { "input": "[]", "expectedOutput": "[]", "isHidden": true }
      ],
      "starterCode": {
        "javascript": "/**\\n * @param {string[]} logs\\n * @return {string[][]}\\n */\\nvar groupAnagramLogs = function(logs) {\\n    \\n};",
        "python": "from typing import List\\nfrom collections import defaultdict\\n\\nclass Solution:\\n    def groupAnagramLogs(self, logs: List[str]) -> List[List[str]]:\\n        ",
        "java": "class Solution {\\n    public List<List<String>> groupAnagramLogs(String[] logs) {\\n        \\n    }\\n}",
        "cpp": "class Solution {\\npublic:\\n    vector<vector<string>> groupAnagramLogs(vector<string>& logs) {\\n        \\n    }\\n};"
      }
    }
  ]
}`
}

// ── DSA Coding Prompt ──────────────────────────────────────────
export function dsaPrompt(cfg: any): string {
  const total     = Math.ceil((cfg.problemCount || 2) * 2.5)
  const langs     = (cfg.allowedLanguages || ['javascript', 'python']).join(', ')
  const hasTopics = cfg.dsaTopics?.length > 0

  let topicInstruction = ''
  if (hasTopics) {
    const selected: string[] = cfg.dsaTopics
    topicInstruction = `
Focus ONLY on these selected DSA topics (distribute problems across them):
${selected.map((t: string) => `- ${t}`).join('\n')}
`
  } else {
    topicInstruction = `
Cover a balanced mix across: Arrays, Strings, Linked Lists, Trees, Dynamic Programming, Sorting & Searching, Stack & Queue.
`
  }

  return `You are a LeetCode problem setter creating high-quality DSA problems for corporate technical interviews.

Generate exactly ${total} problems in authentic LeetCode style.
Difficulty split: ${cfg.difficultyEasy || 0}% Easy, ${cfg.difficultyMedium || 50}% Medium, ${cfg.difficultyHard || 50}% Hard.
${topicInstruction}

DIFFICULTY STANDARDS — follow exactly:
- EASY: requires 1-2 non-trivial steps. NOT single-liners. Examples: Two Sum, Valid Parentheses, Merge Two Sorted Lists. Avoid: find max, sum array, reverse string.
- MEDIUM: requires algorithmic insight. Examples: Longest Substring Without Repeating Characters, Container With Most Water, Number of Islands, Coin Change.
- HARD: requires advanced techniques. Examples: Median of Two Sorted Arrays, Trapping Rain Water, Word Ladder, Edit Distance with constraints.

LEETCODE STYLE RULES — every problem must follow all of these:
1. Problem statement written in clear prose — describe the SCENARIO first, then the task. No raw "Given array, find X" openings.
2. Use proper noun for function: "implement function twoSum", not "write code to".
3. Examples must show: Input → label each parameter by name, Output → exact return value, Explanation → step-by-step reasoning showing WHY the output is correct.
4. Constraints section must include: array size range (1 <= n <= 10^5), value range (-10^9 <= nums[i] <= 10^9), expected time complexity hint, and any special constraints.
5. Function signature must be clearly defined in the starter code with proper parameter names and return type comments.
6. Test cases: 2 visible (matching your examples exactly) + 3 hidden edge cases (empty-ish inputs, large n, negative values, duplicates).
7. Starter code must have JSDoc/docstring with @param and @return annotations.
8. NEVER generate trivial problems: no "find maximum", no "count elements", no "sum of array", no "reverse a string" as standalone problems.

Respond ONLY with valid JSON — no markdown, no explanation, just the JSON object:
{
  "problems": [
    {
      "type": "CODING",
      "difficulty": "EASY" | "MEDIUM" | "HARD",
      "topicTag": "e.g. Hash Map · Sliding Window · Dynamic Programming",
      "problemTitle": "e.g. Two Sum, Longest Substring Without Repeating Characters",
      "problemStatement": "Full LeetCode-style prose description. Describe what is given, what to return, any special rules. Use backticks for variable names like \`nums\` and \`target\`. End with: Return [exact description of what to return].",
      "constraints": "- 2 <= nums.length <= 10^4\\n- -10^9 <= nums[i] <= 10^9\\n- Only one valid answer exists\\n- Expected: O(n) time, O(n) space",
      "examples": [
        {
          "input": "nums = [2,7,11,15], target = 9",
          "output": "[0,1]",
          "explanation": "Because nums[0] + nums[1] == 9, we return [0, 1]. We check each element: 9 - 2 = 7, and 7 exists at index 1."
        }
      ],
      "testCases": [
        { "input": "[2,7,11,15]\\n9", "expectedOutput": "[0,1]", "isHidden": false },
        { "input": "[3,2,4]\\n6", "expectedOutput": "[1,2]", "isHidden": false },
        { "input": "[3,3]\\n6", "expectedOutput": "[0,1]", "isHidden": true },
        { "input": "[-1,-2,-3,-4,-5]\\n-8", "expectedOutput": "[2,4]", "isHidden": true },
        { "input": "[1000000000,1000000000]\\n2000000000", "expectedOutput": "[0,1]", "isHidden": true }
      ],
      "starterCode": {
        "javascript": "/**\\n * @param {number[]} nums\\n * @param {number} target\\n * @return {number[]}\\n */\\nvar twoSum = function(nums, target) {\\n    \\n};",
        "python": "class Solution:\\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\\n        ",
        "java": "class Solution {\\n    public int[] twoSum(int[] nums, int target) {\\n        \\n    }\\n}",
        "cpp": "class Solution {\\npublic:\\n    vector<int> twoSum(vector<int>& nums, int target) {\\n        \\n    }\\n};"
      }
    }
  ]
}`
}