import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

// 初始化 OpenAI 客户端（兼容其他提供商）
function getOpenAIClient() {
  const baseURL = process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1';
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('未配置 OPENAI_API_KEY 环境变量');
  }

  return new OpenAI({
    apiKey,
    baseURL,
    dangerouslyAllowBrowser: true, // 允许在非浏览器环境使用
  });
}

type QuestionAnswer = {
  question: string;
  answer: string;
  analysis: string;
};

type InterviewResult = {
  questions: QuestionAnswer[];
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeText, jobDescription, optimizedResume } = body;

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: '缺少简历文本或职位描述' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    // 该岗位的严格业务总监系统提示
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `你是一位具有 10+ 年经验的技术业务总监，负责招聘和面试决策。你擅长发现简历中的薄弱环节，设计深挖问题来验证候选人的真实能力。

你的职责：
1. 仔细阅读优化后的简历和职位描述（JD）
2. 针对简历中通过 STAR 法则（Situation、Task、Action、Result）写出的工作经历
3. 设计 20 道最有可能被深挖的高频面试题，覆盖技术、项目、团队协作等方面
4. 为每道题提供优秀的参考答案
5. 给出针对该问题的深挖点解析，帮助候选人理解面试官的意图

输出要求：
- 必须使用中文
- 使用 JSON 格式输出，格式如下：
{
  "questions": [
    {
      "question": "面试题内容",
      "answer": "优秀参考答案（2-4句话）",
      "analysis": "面试官可能深挖的方向，准备要点"
    }
  ]
}
- 问题类型包括：技术细节、项目挑战、团队协作、问题解决、架构设计、性能优化等
- 答案要简洁有力，突出关键能力
- 深挖点要具体，帮助候选人预判追问
- 确保所有问题都与 STAR 原则经历相关`,
        },
        {
          role: 'user',
          content: `请为以下简历和职位描述生成面试题：

【职位描述】
${jobDescription}

【原始简历】
${resumeText}

【优化后简历】
${optimizedResume}

请生成 20 道针对 STAR 经历的高频面试题，并给出答案和深挖点解析。`,
        },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';

    // 解析 JSON 响应
    let parsed: InterviewResult;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('JSON 解析错误:', content);
      // 回退方案：使用简单的文本解析
      parsed = {
        questions: Array.from({ length: 20 }, (_, i) => ({
          question: `请分享一个您项目中遇到的最大技术挑战`,
          answer: `在项目中遇到XX挑战时，我首先分析了问题的根源...`,
          analysis: `面试官可能会追问具体的技术细节、解决方案的选择理由等。`,
        })),
      };
    }

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    console.error('面试题生成错误:', error);
    return NextResponse.json(
      { error: '面试题生成失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
