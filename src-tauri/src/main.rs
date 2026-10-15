// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Manager, Window};

#[cfg(target_os = "windows")]
fn apply_windows_stealth_exclusion(window: &Window) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{SetWindowDisplayAffinity, WDA_EXCLUDEFROMCAPTURE};

    if let Ok(hwnd) = window.hwnd() {
        unsafe {
            // WDA_EXCLUDEFROMCAPTURE (0x00000011) strips the window from Zoom, Teams, OBS, Meet
            let win_hwnd = HWND(hwnd.0 as isize);
            let _ = SetWindowDisplayAffinity(win_hwnd, WDA_EXCLUDEFROMCAPTURE);
            println!("[GhostAssist] Windows screen capture exclusion applied: WDA_EXCLUDEFROMCAPTURE");
        }
    }
}

#[cfg(target_os = "macos")]
fn apply_macos_stealth_exclusion(window: &Window) {
    use cocoa::appkit::NSWindow;
    use cocoa::base::id;
    use objc::{msg_send, sel, sel_impl};

    if let Ok(ns_window) = window.ns_window() {
        unsafe {
            let ns_win = ns_window as id;
            // NSWindowSharingNone (0) prevents window from appearing in ScreenCaptureKit or Zoom screen share
            let _: () = msg_send![ns_win, setSharingType: 0];
            println!("[GhostAssist] macOS NSWindowSharingNone exclusion applied");
        }
    }
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let main_window = app.get_window("main").unwrap();

            #[cfg(target_os = "windows")]
            apply_windows_stealth_exclusion(&main_window);

            #[cfg(target_os = "macos")]
            apply_macos_stealth_exclusion(&main_window);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running GhostAssist Tauri application");
}
