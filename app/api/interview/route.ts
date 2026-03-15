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

    // 该岗位严苛的高级业务总监系统提示
    const response = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: `你是一位该岗位严苛的高级业务总监，拥有 15+ 年技术管理和面试经验。你擅长发现简历中的薄弱环节，设计深挖问题来验证候选人的真实能力。

## 你的职责：
1. 仔细阅读【优化后的简历】和【目标岗位 JD】
2. 针对简历中通过 STAR 法则（Situation、Task、Action、Result）写出的工作经历
3. 生成 20 道完全不同的高频面试题

## 绝对规则（严禁重复）：

### 问题维度分配
必须生成以下 20 道题，每道题必须完全不同，不允许出现相同的知识点或项目细节：

1. **底层技术深挖题（5 道）**
   - 深入技术原理、底层实现机制
   - 性能优化、内存管理
   - 并发处理、异步机制
   - 示例：HashMap 底层原理、线程池实现、垃圾回收机制

2. **系统架构/业务逻辑题（5 道）**
   - 微服务架构设计
   - 分布式系统一致性
   - 数据库设计策略
   - 业务流程优化
   - 示例：如何设计秒杀系统、数据库分库分表策略、分布式锁实现

3. **跨部门协作/软技能题（5 道）**
   - 团队冲突解决
   - 代码 Review 态度
   - 跨团队协作机制
   - 技术决策过程
   - 示例：如何处理团队技术分歧、如何推动技术债务偿还

4. **极端异常场景处理题（3 道）**
   - 线上故障排查
   - 性能问题诊断
   - 紧急修复策略
   - 示例：线上 OOM 如何处理、数据库连接池耗尽如何应对

5. **过往项目踩坑复盘题（2 道）**
   - 项目中的重大失误
   - 从中学到的教训
   - 改进措施
   - 示例：曾经遇到的最严重的生产问题、如果重来会如何改进

## 界面允许
- ❌ 绝对不允许任何两道题呈现相同的知识点
- ❌ 绝对不允许任何两道题描述同一个项目的细节
- ❌ 绝对不允许任何两道题问类似的问题

## 输出格式
必须使用 JSON 格式，格式如下：
{
  "questions": [
    {
      "question": "问题描述（20-30 字）",
      "answer": "基于 STAR 原则的满分回答框架（2-4 句话）",
      "analysis": "面试官意图意图，可能深挖的方向，准备要点（30-50 字）"
    }
  ]
}

## 答案要求
- 使用 STAR 原则：Situation（情境）、Task（任务）、Action（行动）、Result（结果）
- 简洁有力，突出关键能力
- 每个答案不超过 80 字`,
        },
        {
          role: 'user',
          content: `请为以下简历和职位描述生成 20 道完全不同的高频面试题：

【目标岗位 JD】
${jobDescription}

【原始简历】
${resumeText}

【优化后简历】
${optimizedResume}

请严格按照上述维度分配生成 20 道题，确保每道题都不同。`,
        },
      ],
      temperature: 0.4, // 降低温度以减少重复和幻觉
      max_tokens: 2500, // 限制输出长度
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';

    // 解析 JSON 响应
    let parsed: InterviewResult;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('JSON 解析错误:', content);
      // 如果解析失败，返回错误
      return NextResponse.json(
        { error: '面试题解析失败' },
        { status: 500 }
      );
    }

    // 验证问题数量
    if (!parsed.questions || parsed.questions.length !== 20) {
      console.error('问题数量不正确:', parsed.questions?.length);
      return NextResponse.json(
        { error: '面试题生成失败：问题数量不正确' },
        { status: 500 }
      );
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
