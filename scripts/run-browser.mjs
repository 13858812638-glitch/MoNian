import {spawnSync} from 'node:child_process';
const python=process.env.PYTHON||(process.platform==='win32'?'python':'python3');
const result=spawnSync(python,['scripts/browser_ab.py'],{stdio:'inherit',env:process.env});
if(result.error){console.error('Browser tests require Python + requirements-test.txt and Chromium. Set PYTHON/CHROMIUM_PATH as needed.');console.error(result.error.message);process.exit(2);}
process.exit(result.status??1);
