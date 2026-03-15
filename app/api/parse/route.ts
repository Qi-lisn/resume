import { NextRequest, NextResponse } from 'next/server';
import mammoth from 'mammoth';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: '未提供文件' }, { status: 400 });
    }

    const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';

    // 只支持 Word 文档，图片 OCR 移至前端
    if (fileExtension !== 'docx') {
      return NextResponse.json({ error: '仅支持 .docx 格式的文件。图片识别请直接在前端进行。' }, { status: 400 });
    }

    const extractedText = await parseDocx(file);

    return NextResponse.json({
      success: true,
      text: extractedText,
      fileName: file.name
    });

  } catch (error) {
    console.error('文件解析错误:', error);
    return NextResponse.json(
      { error: '文件解析失败: ' + (error as Error).message },
      { status: 500 }
    );
  }
}

async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}
