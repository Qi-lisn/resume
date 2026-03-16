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

    if (!resumeText || !jobDescription || !optimizedResume) {
      return NextResponse.json(
        { error: '缺少必要的输入数据：简历文本、职位描述或优化后简历' },
        { status: 400 }
      );
    }

    // 检查数据是否过短或为占位符
    const minLength = 50;
    if (resumeText.length < minLength || jobDescription.length < minLength || optimizedResume.length < minLength) {
      return NextResponse.json(
        { error: '输入数据不完整，请确保简历和职位描述包含足够的内容' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    // 该岗位严苛的高级业务总监系统提示
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `你是一位该岗位严苛的高级业务总监。请根据【优化后的简历】和【目标岗位 JD】，生成 20 道完全不同的高频面试题。

要求：
1. 必须使用中文
2. 20 道题必须完全不同，不允许重复
3. 涵盖不同维度：技术深挖、架构设计、跨团队协作、异常处理、项目复盘

输出格式：
必须返回纯 JSON 格式，不要包含任何其他文字、代码块标记或说明：
{"questions":[{"question":"问题描述","answer":"基于 STAR 原则的参考答案","analysis":"深挖方向"}]}`,
        },
        {
          role: 'user',
          content: `【目标岗位 JD】
${jobDescription}

【优化后简历】
${optimizedResume}`,
        },
      ],
      temperature: 0.4,
      max_tokens: 16000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';

    // 清理可能存在的 markdown 代码块标记（处理多种可能的格式）
    let cleanedContent = content;
    cleanedContent = cleanedContent.replace(/^```json\s*\n/i, ''); // 移除开头的 ```json
    cleanedContent = cleanedContent.replace(/^```\s*\n/i, ''); // 移除开头的 ```
    cleanedContent = cleanedContent.replace(/\n```$/g, ''); // 移除结尾的 ```
    cleanedContent = cleanedContent.trim();

    // 先尝试解析 JSON，如果失败再检查是否为错误消息
    let parsed: InterviewResult;
    try {
      parsed = JSON.parse(cleanedContent);
    } catch (e) {
      // 解析失败，检查是否以 { 开头
      if (!cleanedContent.startsWith('{')) {
        console.error('模型返回了非 JSON 格式的响应:', cleanedContent.substring(0, 200));
        return NextResponse.json(
          { error: '面试题生成失败：模型返回了错误信息，请检查输入数据是否完整' },
          { status: 500 }
        );
      }

      // 如果以 { 开头但解析失败，可能是 JSON 不完整或格式错误
      console.error('JSON 解析错误（可能被截断）:', cleanedContent.substring(0, 500));
      return NextResponse.json(
        { error: '面试题生成失败：响应数据不完整或格式错误，请重试' },
        { status: 500 }
      );
    }

    // 验证问题数量和格式
    if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      console.error('问题数量不正确:', parsed.questions?.length);
      return NextResponse.json(
        { error: '面试题生成失败：未生成有效的问题' },
        { status: 500 }
      );
    }

    // 验证每个问题的格式
    const validQuestions = parsed.questions.filter(q =>
      q.question && q.answer && q.analysis
    );

    if (validQuestions.length === 0) {
      return NextResponse.json(
        { error: '面试题生成失败：所有问题格式不正确' },
        { status: 500 }
      );
    }

    // 如果问题数量不足20个，仍然返回已生成的（但记录警告）
    if (validQuestions.length !== 20) {
      console.warn(`生成了 ${validQuestions.length} 个问题，期望 20 个`);
    }

    return NextResponse.json({
      success: true,
      data: { questions: validQuestions },
    });
  } catch (error) {
    console.error('面试题生成错误:', error);
    return NextResponse.json(
      { error: '面试题生成失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
