chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.action === 'alert') {
            alert(request.text);
        }
    }
);