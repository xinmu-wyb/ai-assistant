const { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, ShadingType, PageBreak, BorderStyle } = require('docx');

// 创建文档
const doc = new Document({
    sections: [{
        properties: {
            page: {
                size: {
                    width: 11906, // A4 width in DXA
                    height: 16838 // A4 height in DXA
                }
            }
        },
        children: [
            // 标题
            new Paragraph({
                text: "用户登录功能测试用例文档",
                heading: HeadingLevel.TITLE,
                alignment: AlignmentType.CENTER,
                spacing: { after: 400 }
            }),
            
            // 文档信息
            new Paragraph({
                text: "文档版本：V1.0",
                spacing: { after: 200 }
            }),
            new Paragraph({
                text: "创建日期：" + new Date().toLocaleDateString('zh-CN'),
                spacing: { after: 200 }
            }),
            new Paragraph({
                text: "作者：测试团队",
                spacing: { after: 400 }
            }),
            
            // 目录标题
            new Paragraph({
                text: "目录",
                heading: HeadingLevel.HEADING_1,
                spacing: { before: 400, after: 200 }
            }),// 目录内容（手动创建）
            new Paragraph({
                children: [
                    new TextRun({ text: "1. 文档概述", break: 1 }),
                    new TextRun({ text: "2. 测试范围", break: 1 }),
                    new TextRun({ text: "3. 测试环境", break: 1 }),
                    new TextRun({ text: "4. 测试用例设计", break: 1 }),
                    new TextRun({ text: "   4.1 功能测试用例", break: 1 }),
                    new TextRun({ text: "   4.2 安全性测试用例", break: 1 }),
                    new TextRun({ text: "   4.3 性能测试用例", break: 1 }),
                    new TextRun({ text: "   4.4 兼容性测试用例", break: 1 }),
                    new TextRun({ text: "5. 测试数据准备", break: 1 }),
                    new TextRun({ text: "6. 测试执行计划", break: 1 }),
                    new TextRun({ text: "7. 缺陷管理", break: 1 }),
                    new TextRun({ text: "8. 测试报告模板", break: 1 })
                ],
                spacing: { after: 400 }
            }),
            
            // 分页
            new Paragraph({
                children: [new PageBreak()]
            })
        ]
    }]
});// 添加文档概述部分
doc.addSection({
    children: [
        new Paragraph({
            text: "1. 文档概述",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
            text: "本文档旨在为用户登录功能提供全面的测试用例，确保登录功能的正确性、安全性、性能和用户体验。",
            spacing: { after: 200 }
        }),
        new Paragraph({
            text: "测试目标：",
            spacing: { after: 100 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "• 验证用户登录功能是否按照需求规格正确实现", break: 1 }),
                new TextRun({ text: "• 确保登录过程的安全性，防止常见的安全漏洞", break: 1 }),
                new TextRun({ text: "• 验证登录功能的性能指标满足要求", break: 1 }),
                new TextRun({ text: "• 确保登录功能在不同环境和设备上的兼容性", break: 1 }),
                new TextRun({ text: "• 验证异常情况下的系统行为", break: 1 })
            ],
            spacing: { after: 200 }
        }),new Paragraph({
            text: "2. 测试范围",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
        }),
        new Paragraph({
            text: "本次测试覆盖以下功能点：",
            spacing: { after: 100 }
        }),
        new Paragraph({
            children: [
                new TextRun({ text: "• 用户名/邮箱登录", break: 1 }),
                new TextRun({ text: "• 密码输入与验证", break: 1 }),
                new TextRun({ text: "• 记住密码功能", break: 1 }),
                new TextRun({ text: "• 自动登录功能", break: 1 }),
                new TextRun({ text: "• 忘记密码功能", break: 1 }),
                new TextRun({ text: "• 验证码功能", break: 1 }),
                new TextRun({ text: "• 第三方登录（可选）", break: 1 }),
                new TextRun({ text: "• 登录后的页面跳转", break: 1 })
            ],
            spacing: { after: 200 }
        })
    ]
});