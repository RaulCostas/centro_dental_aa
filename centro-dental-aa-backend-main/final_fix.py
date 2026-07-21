import os
import re

backend_src_dir = r"d:\SOFT-MEDIC\Antigravity\CLINICA DENTAL\clinica-dental-backend-main\src"

def fix_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    original = content

    if "historia_clinica.service.ts" in filepath:
        if "import { HistoriaClinica } from" not in content:
            content = "import { HistoriaClinica } from './entities/historia_clinica.entity';\n" + content

    if "historia_clinica.module.ts" in filepath:
        if "import { HistoriaClinica } from" not in content:
            content = "import { HistoriaClinica } from './entities/historia_clinica.entity';\n" + content

    if "historia_clinica.controller.ts" in filepath:
        content = content.replace("findPendientesPago(undefined)", "findPendientesPago()")
        content = content.replace("+undefined", "undefined")
        content = content.replace("}, undefined);", "});")
        content = content.replace("const clinicaId = undefined;", "")

    if "doctors.service.ts" in filepath:
        content = re.sub(r"const clinicaIdNumber\s*=\s*undefined\s*\?\s*parseInt\(10\)\s*:\s*0;", "const clinicaIdNumber = 0;", content)
        content = re.sub(r"if\s*\(\s*0\s*>\s*0\s*\)\s*\{[^\}]+\}", "", content)

    if "cubetas.controller.ts" in filepath:
        content = content.replace("undefined ? Number(undefined) : undefined)", "undefined)")

    if "inventario.controller.ts" in filepath:
        content = content.replace("findExpiringDetails()", "findExpiringDetails(undefined)")
        content = content.replace("grupoId && grupoId !== 'all' ? +grupoId : undefined", "grupoId && grupoId !== 'all' ? String(grupoId) : undefined")
        # For the expected 0-1 arguments but got 2
        content = re.sub(r"this\.inventarioService\.findExpiringDetails\([^\)]*,\s*undefined\)", "this.inventarioService.findExpiringDetails(undefined)", content)

    if "proformas.controller.ts" in filepath:
        content = content.replace("findAllByPaciente(+undefined)", "findAllByPaciente(undefined)")

    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)

for root, _, files in os.walk(backend_src_dir):
    for f in files:
        if f.endswith('.ts'):
            fix_file(os.path.join(root, f))
