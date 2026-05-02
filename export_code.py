import os

files_to_export = [
    r'backend\main.py',
    r'backend\models.py',
    r'backend\services\pncp_client.py',
    r'backend\services\llm_engine.py',
    r'backend\agent_brain.py',
    r'frontend\app\page.tsx',
    r'frontend\components\LicitacaoDetailModal.tsx',
    r'frontend\components\PipelineKanban.tsx'
]

with open('codigo_para_chat.txt', 'w', encoding='utf-8') as out_file:
    for filepath in files_to_export:
        if os.path.exists(filepath):
            out_file.write(f'\n\n{"="*50}\n')
            out_file.write(f'ARQUIVO: {filepath}\n')
            out_file.write(f'{"="*50}\n\n')
            try:
                with open(filepath, 'r', encoding='utf-8') as in_file:
                    out_file.write(in_file.read())
            except Exception as e:
                out_file.write(f"ERRO AO LER ARQUIVO: {e}\n")

print('✅ Arquivo gerado com sucesso!')
