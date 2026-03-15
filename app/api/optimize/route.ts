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

type OptimizationResult = {
  keywordMatch: string;
  contentRewrite: string;
  starPrinciple: string;
  atsScore: number;
  suggestions: string[];
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { resumeText, jobDescription } = body;

    if (!resumeText || !jobDescription) {
      return NextResponse.json(
        { error: '缺少简历文本或职位描述' },
        { status: 400 }
      );
    }

    const openai = getOpenAIClient();
    const model = process.env.OPENAI_MODEL || 'gpt-4o';

    // 并行执行四个优化任务
    const [keywordMatch, contentRewrite, starPrinciple, atsScore] =
      await Promise.all([
        analyzeKeywordMatch(openai, model, resumeText, jobDescription),
        rewriteResumeContent(openai, model, resumeText, jobDescription),
        optimizeStarPrinciple(openai, model, resumeText, jobDescription),
        calculateATSScore(openai, model, resumeText, jobDescription),
      ]);

    // 生成建议
    const suggestions = await generateSuggestions(
      openai,
      model,
      resumeText,
      jobDescription,
      keywordMatch,
      atsScore
    );

    const result: OptimizationResult = {
      keywordMatch,
      contentRewrite,
      starPrinciple,
      atsScore,
      suggestions,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('优化错误:', error);
    return NextResponse.json(
      { error: '优化失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

// 1. 关键词匹配分析
async function analyzeKeywordMatch(
  openai: OpenAI,
  model: string,
  resumeText: string,
  jobDescription: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `你是一个专业的 ATS（申请人跟踪系统）专家。请分析简历与职位描述的关键词匹配度。

分析要求：
1. 识别 JD 中的核心技能关键词（硬技能、软技能、工具等）
2. 检查简历中是否包含这些关键词
3. 计算匹配率（匹配关键词数 / JD 总关键词数）
4. 列出简历中缺失但 JD 需要的关键词
5. 列出简历中存在但 JD 未提及的关键词（额外加分项）

请用中文回答，使用清晰的格式化输出。`,
      },
      {
        role: 'user',
        content: `请分析以下简历与职位描述的关键词匹配度：

【职位描述】
${jobDescription}

【简历内容】
${resumeText}`,
      },
    ],
    temperature: 0.3,
  });

  return response.choices[0]?.message?.content || '';
}

// 2. 简历内容重写
async function rewriteResumeContent(
  openai: OpenAI,
  model: string,
  resumeText: string,
  jobDescription: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `你是一个专业的简历优化专家。请根据职位描述重写简历内容。

优化原则：
1. 保留简历的核心信息和真实经历
2. 根据JD要求调整用词，突出相关技能
3. 使用行业术语和ATS友好关键词
4. 保持简历的真实性和专业性
5. 优化各部分的表达方式，使其更简洁有力

请用中文重写，输出完整的优化后的简历内容。`,
      },
      {
        role: 'user',
        content: `请根据以下职位描述优化简历：

【职位描述】
${jobDescription}

【原始简历】
${resumeText}`,
      },
    ],
    temperature: 0.5,
  });

  return response.choices[0]?.message?.content || '';
}

// 3. STAR 原则优化
async function optimizeStarPrinciple(
  openai: OpenAI,
  model: string,
  resumeText: string,
  jobDescription: string
): Promise<string> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `你是一个专业的简历优化专家，精通STAR原则（Situation、Task、Action、Result）。

STAR原则说明：
- Situation: 工作背景和情境
- Task: 面临的任务和挑战
- Action: 采取的具体行动和解决方案
- Result: 取得的成果和量化结果

请将简历中的工作经历改写为STAR格式。`,
      },
      {
        role: 'user',
        content: `请将以下简历的工作经历改写为STAR原则格式：

【职位描述】
${jobDescription}

【原始简历】
${resumeText}`,
      },
    ],
    temperature: 0.5,
  });

  return response.choices[0]?.message?.content || '';
}

// 4. ATS 评分
async function calculateATSScore(
  openai: OpenAI,
  model: string,
  resumeText: string,
  jobDescription: string
): Promise<number> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `你是一个专业的 ATS 评分专家。请评估简历的ATS通过率。

评分标准：
1. 关键词匹配度 (30分)
2. 格式规范性 (20分)
3. 内容完整性 (20分)
4. 表达清晰度 (15分)
5. 专业术语使用 (15分)

总分100分。请只返回一个数字（0-100之间的整数），不要包含任何其他文字。`,
      },
      {
        role: 'user',
        content: `请评估以下简历的ATS通过率（0-100分）：

【职位描述】
${jobDescription}

【简历内容】
${resumeText}

请只返回一个数字，代表ATS评分。`,
      },
    ],
    temperature: 0.3,
  });

  const content = response.choices[0]?.message?.content || '0';
  const score = parseInt(content.replace(/\D/g, ''));
  return isNaN(score) ? 60 : Math.min(100, Math.max(0, score));
}

// 5. 生成建议
async function generateSuggestions(
  openai: OpenAI,
  model: string,
  resumeText: string,
  jobDescription: string,
  keywordMatch: string,
  atsScore: number
): Promise<string[]> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `你是一个专业的简历顾问。请根据分析结果给出具体的改进建议。

建议应该：
1. 具体、可操作
2. 针对简历的薄弱环节
3. 帮助提高ATS通过率
4. 包含技能补充建议
5. 包含内容格式优化建议

请给出3-5条建议，每条建议用一句话概括。`,
      },
      {
        role: 'user',
        content: `根据以下分析结果给出改进建议：

【ATS评分】${atsScore}/100

【关键词匹配分析】
${keywordMatch}

【职位描述】
${jobDescription}

【简历内容】
${resumeText}`,
      },
    ],
    temperature: 0.5,
  });

  const content = response.choices[0]?.message?.content || '';
  // 提取建议列表
  const suggestions = content
    .split(/[一二三四五、\n]/)
    .filter(s => s.trim().length > 0);

  return suggestions.length > 0 ? suggestions : ['建议补充更多与JD相关的技能关键词'];
}
