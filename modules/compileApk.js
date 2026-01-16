import { exec } from 'child_process';

async function compile() {
    const isWindows = process.platform === "win32";
    var command = isWindows ? 'gradlew.bat assembleDebug' : './gradlew assembleDebug';
    var options = {
        cwd: './mobile',
        env: { ...process.env, ANDROID_HOME: '/Users/koko.nai/Library/Android/sdk' }
    }
    if (!isWindows) {
        try {
            const fs = await import('fs/promises');
            await fs.chmod('./mobile/gradlew', 0o755);
        } catch (e) {
            console.error("Failed to chmod gradlew", e);
        }
    }
    return await new Promise((resolve, reject) => {
        exec(command, options, (error, stdout, stderr) => {
            if (error) {
                console.error(`exec error:`);
                resolve(false);
            } else {
                if (stderr) console.error(`stderr:`, stderr);
                console.log(`stdout:`);
                resolve(true);
            }
        });
    });
}



export default compile
