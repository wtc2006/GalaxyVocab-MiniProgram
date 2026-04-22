import re
import json
import os

def extract_from_text(input_path, output_path):
    """
    从文本中提取单词和释义
    """
    if not os.path.exists(input_path):
        print(f"❌ 错误: 找不到输入文件 {input_path}")
        return

    vocabulary = []
    # 示例正则表达式，根据实际情况调整
    pattern = re.compile(r'(\w+)\s+(.+)')

    try:
        with open(input_path, 'r', encoding='utf-8') as f:
            for line in f:
                match = pattern.match(line.strip())
                if match:
                    word, definition = match.groups()
                    vocabulary.append({
                        "word": word,
                        "definition": definition
                    })
    except Exception as e:
        print(f"❌ 运行报错: {e}")

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(vocabulary, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 提取完成，已保存至 {output_path}")

if __name__ == "__main__":
    # 使用相对路径
    RAW_FILE = "../raw_assets/vocabulary.txt"
    EXPORT_FILE = "../json/extracted.json"
    
    # 确保目录存在
    os.makedirs(os.path.dirname(EXPORT_FILE), exist_ok=True)
    
    extract_from_text(RAW_FILE, EXPORT_FILE)
