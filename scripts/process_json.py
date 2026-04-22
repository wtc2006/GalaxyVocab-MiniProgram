import json
import os

def process_vocabulary(input_dir, output_file):
    """
    处理词库文件并合并
    """
    all_words = []
    
    # 使用相对路径定位资源
    if not os.path.exists(input_dir):
        print(f"❌ 错误: 找不到目录 {input_dir}")
        return

    for filename in os.listdir(input_dir):
        if filename.endswith('.json'):
            path = os.path.join(input_dir, filename)
            with open(path, 'r', encoding='utf-8') as f:
                try:
                    data = json.load(f)
                    # 假设数据是列表格式
                    if isinstance(data, list):
                        all_words.extend(data)
                except Exception as e:
                    print(f"❌ 解析 {filename} 失败: {e}")

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(all_words, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 处理完成，共 {len(all_words)} 个单词，已保存至 {output_file}")

if __name__ == "__main__":
    # 使用相对路径
    INPUT_PATH = "../json"
    OUTPUT_PATH = "../output/vocabulary.json"
    
    # 确保输出目录存在
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    
    process_vocabulary(INPUT_PATH, OUTPUT_PATH)
