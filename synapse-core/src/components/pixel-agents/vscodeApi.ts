// Replaced VS Code API with a custom mock for the browser environment
export const vscode = {
  postMessage: (msg: unknown) => {
    console.log('Mock vscode.postMessage (Browser API):', msg);
    // Here we can dispatch custom events if we need the outer Next.js app to listen
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vscode-message', { detail: msg }));
    }
  }
};
