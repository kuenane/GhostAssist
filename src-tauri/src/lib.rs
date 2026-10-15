use tauri::{Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

const HOTKEYS: [(Code, &str); 5] = [
    (Code::KeyX, "KeyX"), // panic hide
    (Code::KeyA, "KeyA"), // quick answer
    (Code::KeyS, "KeyS"), // screen snippet
    (Code::KeyM, "KeyM"), // toggle audio
    (Code::KeyC, "KeyC"), // click-through
];

pub fn run() {
    let shortcuts: Vec<Shortcut> = HOTKEYS
        .iter()
        .map(|(code, _)| Shortcut::new(Some(Modifiers::ALT), *code))
        .collect();

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_shortcuts(shortcuts)
                .expect("failed to register shortcuts")
                .with_handler(|app, shortcut, event| {
                    if event.state() != ShortcutState::Pressed {
                        return;
                    }
                    if let Some((_, name)) = HOTKEYS
                        .iter()
                        .find(|(code, _)| shortcut.matches(Modifiers::ALT, *code))
                    {
                        let _ = app.emit("ga-shortcut", *name);
                    }
                })
                .build(),
        )
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                // Windows: WDA_EXCLUDEFROMCAPTURE, macOS: NSWindowSharingNone
                let _ = window.set_content_protected(true);
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running GhostAssist");
}
