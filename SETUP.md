# Setup Guide for bettercamp

## macOS

### 1. Open Terminal

- Press `Cmd + Space` (Spotlight search)
- Type `terminal` and press Enter
- A window with a command prompt should open

### 2. Download the project

1. Open your browser and go to: https://github.com/toph-apps/bettercamp
2. Click the green **Code** button (top right)
3. Click **Download ZIP**
4. Wait for the download to finish (check Downloads folder)
5. Double-click `bettercamp-master.zip` to extract it
6. You should now have a `bettercamp-master` folder on your Desktop or Downloads

In Terminal, navigate to that folder:

```bash
cd ~/Downloads/bettercamp-master
```

(Or replace `Downloads` with wherever you extracted it.)

### 3. Run the installer

```bash
./install.sh
```

Press Enter. The installer will:
- Ask if you want to install missing tools (answer `y` for yes)
- Download and set up Python, Node.js, Docker
- Install project dependencies
- Offer to start the app

### 4. Open the app

Once the installer finishes, open your browser to:

```
http://localhost:5173
```

You should see the bettercamp search page.

To stop the app, go back to Terminal and press `Ctrl + C`.

---

## Windows

### 1. Open PowerShell

- Press `Win + X` (Windows key + X)
- Click "Windows PowerShell" (or "Terminal")
- A blue/black window should open

**Note:** If you see "PowerShell is not recognized", you have Command Prompt instead. That's okay:
- Type `powershell` and press Enter to switch to PowerShell

### 2. Download the project

1. Open your browser and go to: https://github.com/toph-apps/bettercamp
2. Click the green **Code** button (top right)
3. Click **Download ZIP**
4. Wait for the download to finish (check Downloads folder)
5. Right-click `bettercamp-master.zip` and select **Extract All**
6. You should now have a `bettercamp-master` folder in Downloads

In PowerShell, navigate to that folder:

```powershell
cd Downloads\bettercamp-master
```

(Or replace `Downloads` with wherever you extracted it.)

### 3. Run the installer

```powershell
powershell -ExecutionPolicy Bypass -File install.ps1
```

Press Enter. The installer will:
- Ask if you want to install missing tools (answer `y` for yes)
- Download and set up Python, Node.js, Docker
- Install project dependencies
- Automatically open the app in your browser

### 4. Using the app

The app should automatically open at:

```
http://localhost:5173
```

You should see the bettercamp search page.

To stop the app:
- Close the PowerShell windows (the dark one with API logs and the one with web logs)
- Or press `Ctrl + C` in each window

---

## Troubleshooting

### "I closed the terminal/PowerShell by accident"

No problem. Open Terminal/PowerShell again, go to the bettercamp folder:

```bash
cd bettercamp  # or cd path/to/bettercamp if not in the right folder
```

Then start the app:
- **macOS**: `./run.sh`
- **Windows**: `.\run.ps1`

### App doesn't load in browser

Make sure Terminal/PowerShell is still running (it shouldn't say "Exited" or show a cursor ready for new commands).

If you closed it accidentally, restart as above.

### "Permission denied" on macOS

If you get a permission error, run:

```bash
chmod +x install.sh run.sh
./install.sh
```

---

## Next: Driving Distance (Optional)

Once everything is working, you can enable driving distance calculations by building the routing graph.

### macOS/Linux

```bash
make osrm-build    # 10-15 minutes, ~700 MB download
make osrm-up       # Start the routing service
```

Then restart the app with `./run.sh` in another Terminal window.

### Windows

```powershell
.\osrm-build.ps1   # 10-15 minutes, ~700 MB download
docker compose up -d osrm  # Start the routing service
.\run.ps1          # Restart the app
```

---

## Need help?

Check the main [README.md](README.md) for more details.
