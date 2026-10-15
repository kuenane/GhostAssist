use keyring::Entry;
use tauri::command;

const KEYRING_SERVICE: &str = "ghostassist";

fn entry_for_provider(provider: &str) -> Entry {
    Entry::new(KEYRING_SERVICE, &format!("ghostassist_{}", provider))
}

#[command]
pub fn get_api_key(provider: String) -> Result<Option<String>, String> {
    let entry = entry_for_provider(&provider);
    match entry.get_password() {
        Ok(password) => Ok(Some(password)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(e) => Err(format!("Failed to read API key: {}", e)),
    }
}

#[command]
pub fn set_api_key(provider: String, key: String) -> Result<(), String> {
    let entry = entry_for_provider(&provider);
    entry
        .set_password(&key)
        .map_err(|e| format!("Failed to save API key: {}", e))?;
    Ok(())
}

#[command]
pub fn delete_api_key(provider: String) -> Result<(), String> {
    let entry = entry_for_provider(&provider);
    entry
        .delete_password()
        .map_err(|e| format!("Failed to delete API key: {}", e))?;
    Ok(())
}

#[command]
pub fn list_providers() -> Result<Vec<String>, String> {
    // keyring doesn't provide a direct "list all entries for service" API
    // We return the known providers that the app supports
    let known_providers = vec![
        "gemini".to_string(),
        "nvidia".to_string(),
        "groq".to_string(),
        "openai".to_string(),
        "anthropic".to_string(),
        "deepseek".to_string(),
        "ollama".to_string(),
        "custom".to_string(),
    ];
    Ok(known_providers)
}