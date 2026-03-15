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

type StudyPlanResult = {
  learningPoints: string[];
  recommendedResources: string[];
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

    // 硅谷高级职业导师系统提示
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `你是一位硅谷高级职业导师，拥有 20+ 年技术招聘和职业辅导经验。你擅长分析候选人的能力差距，并制定针对性的学习计划。

你的职责：
1. 深入分析简历与职位描述（JD）之间的能力差距
2. 识别最重要的 3-5 个学习重点，优先级从高到低
3. 推荐相关的开源库、工具或技术资源
4. 提供具体、可操作的学习建议

输出要求：
- 必须使用中文
- 学习重点部分：使用 Markdown 列表格式，每条包含技能名称、当前水平、目标水平、学习方法
- 推荐资源部分：使用 Markdown 列表格式，包含资源名称、链接（如有）、适用场景
- 保持专业、鼓励的语气
- 每个学习重点不超过 50 字`,
        },
        {
          role: 'user',
          content: `请根据以下简历和职位描述，制定学习计划：

【职位描述】
${jobDescription}

【简历内容】
${resumeText}`,
        },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || '';

    // 解析学习重点和推荐资源
    const learningPoints: string[] = [];
    const recommendedResources: string[] = [];

    // 简单的解析逻辑（实际生产中可以使用更复杂的解析）
    const lines = content.split('\n');
    let currentSection = '';
    for (const line of lines) {
      if (line.includes('学习重点') || line.includes('推荐资源')) {
        currentSection = line.includes('学习重点') ? 'learning' : 'resources';
        continue;
      }

      if (line.startsWith('- ') || line.startsWith('• ')) {
        const point = line.replace(/^- |^• /, '').trim();
        if (currentSection === 'learning' && point) {
          learningPoints.push(point);
        } else if (currentSection === 'resources' && point) {
          recommendedResources.push(point);
        }
      }
    }

    // 如果解析失败，使用简单回退
    if (learningPoints.length === 0) {
      // 提取所有内容作为学习重点
      learningPoints.push('深入理解职位要求，制定系统的学习计划');
      learningPoints.push('加强核心技能学习，重点提升技术深度');
      learningPoints.push('多实践项目开发，积累实战经验');
    }

    if (recommendedResources.length === 0) {
      recommendedResources.push('GitHub 开源项目（按语言或框架搜索）');
      recommendedResources.push('官方文档和教程');
      recommendedResources.push('技术社区和论坛（Stack Overflow、GitHub Discussions）');
      recommendedResources.push('在线学习平台（Coursera、Udemy、freeCodeCamp）');
    }

    const result: StudyPlanResult = {
      learningPoints,
      recommendedResources,
    };

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('学习计划生成错误:', error);
    return NextResponse.json(
      { error: '学习计划生成失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
