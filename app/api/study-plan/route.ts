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

    // 顶尖硅谷技术猎头系统提示
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `你是一位顶尖的硅谷技术猎头，拥有 15+ 年技术招聘经验。你的任务是根据【原简历】和【目标职位JD】，定制精准的快速学习计划。

## 绝对规则：

### 强锚定 JD
- **必须且只能**从【目标职位 JD】中提取要求
- 坚决禁止推荐任何 JD 中未提及的技术栈（例如 JD 没写微服务就绝对不提）
- 坚决禁止臆想任何技术或框架，严格以 JD 为准

### 精准找差
- 对比简历和 JD，找出结果最欠缺的 3 项核心能力
- 分析差距的优先级：最关键的差距优先

### 输出格式
1. 必须使用中文
2. 极简 Markdown 格式
3. 必须包含以下三个部分：

## 第一部分：3 项核心能力差距说明
- 使用有序列表（1.、2.、3.）
- 每项说明：缺失的核心能力、当前差距程度（小/中/大）、该能力对岗位的重要性
- 每项不超过 40 字

## 第二部分：短期快速资源推荐
- 仅推荐 JD 中明确提及的技术栈相关资源
- 每个资源必须包含：资源类型（文档/教程/实战项目）、学习路径（1-2 周）
- 推荐不超过 5 个资源
- 使用无序列表

## 第三部分：面试防御话术
- 针对 3 项核心差距，各提供 2-3 条应对策略
- 重点强调已有的项目经验和可转移技能
- 使用无序列表

### 禁止事项：
- ❌ 不允许添加任何 JD 中未出现的技术或框架
- ❌ 不允许建议学习任何未在 JD 中列出的技能
- ❌ 不允许泛泛而谈，必须具体到 JD 内容
- ❌ 不允许超过每部分的字数限制`,
        },
        {
          role: 'user',
          content: `请根据以下【原简历】和【目标职位 JD】，制定学习计划：

【目标职位 JD】
${jobDescription}

【原简历】
${resumeText}`,
        },
      ],
      temperature: 0.3, // 降低温度以减少幻觉
      max_tokens: 1500, // 限制输出长度
    });

    const content = response.choices[0]?.message?.content || '';

    // 解析输出
    const learningPoints: string[] = [];
    const recommendedResources: string[] = [];

    const lines = content.split('\n');
    let currentSection = '';

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.includes('## 第一部分') || trimmedLine.includes('## 第二部分') || trimmedLine.includes('## 第三部分')) {
        currentSection = trimmedLine.includes('第一部分') ? 'learning' : trimmedLine.includes('第二部分') ? 'resources' : 'defense';
        continue;
      }

      if (currentSection === 'learning' && trimmedLine.match(/^\d+\./)) {
        learningPoints.push(trimmedLine);
      } else if (currentSection === 'resources' && (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• '))) {
        recommendedResources.push(trimmedLine);
      } else if (currentSection === 'defense' && (trimmedLine.startsWith('- ') || trimmedLine.startsWith('• '))) {
        learningPoints.push(trimmedLine); // 防御话术也加入学习重点
      }
    }

    // 如果解析失败，返回基础结构
    if (learningPoints.length === 0) {
      learningPoints.push('请仔细分析 JD 中明确要求的技术栈');
      learningPoints.push('重点提升 JD 中提及的核心能力');
      learningPoints.push('保持简历真实性，不夸大或虚构经历');
    }

    if (recommendedResources.length === 0) {
      recommendedResources.push('JD 官方技术文档和入门教程');
      recommendedResources.push('GitHub 上对应技术栈的优质开源项目');
      recommendedResources.push('官方或社区推荐的实战练习');
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
