with open(r'd:\SOFT-MEDIC\Antigravity\CLINICA DENTAL\clinica-dental-backend-main\broken_files.txt', 'r', encoding='utf-16') as f:
    lines = f.readlines()
    for line in lines:
        print(line.strip())
