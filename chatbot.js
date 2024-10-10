class WChatBot extends HTMLElement {
    constructor() {
        super();
        this.API_URL_W_CHATBOT = 'http://localhost:8080/';
        this.attachShadow({ mode: 'open' });
        this.chatbotId = this.getAttribute('chatbotId');
        this.token = this.getAttribute('token') || localStorage.getItem(this.getAttribute('keyLocal') || 'chatbot-token');
        this.chatbotConfig = null;
        this.isAnswering = false;
        const style = document.createElement('style');
        style.textContent = `
            @font-face {
                font-family: 'primeicons';
                font-display: block;
                src: url('https://cdnjs.cloudflare.com/ajax/libs/primeicons/7.0.0/fonts/primeicons.woff2') format('woff2');
                font-weight: normal;
                font-style: normal;
            }
        `;
        document.head.appendChild(style);
    }

    connectedCallback() {
        this.initChatbot();
    }

    async initChatbot() {
        await this.loadChatbotConfig();
        await this.loadChatsHistory();
        this.render();
    }

    async loadChatbotConfig() {
        if (!this.token || !this.chatbotId) return;
        const response = await fetch(this.API_URL_W_CHATBOT + 'api/chatbot_config', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.token
            },
            body: JSON.stringify({ chatbot_id: this.chatbotId })
        })
        const data = await response.json();
        this.chatbotConfig = data;
        if (!this.chatbotConfig) return;
        if (this.chatbotConfig.picture) await this.fetchImage(this.chatbotConfig.picture);
        this.messages = [
            { role: 'assistant', content: this.chatbotConfig?.welcome_message || 'Hola, soy un chatbot' },
        ];
    }

    async loadChatsHistory() {
        if (!this.token || !this.chatbotId) return;
        const response = await fetch(this.API_URL_W_CHATBOT + 'api/chat_history', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.token
            },
            body: JSON.stringify({ chatbot_id: this.chatbotId })
        });
        const data = await response.json();
        this.messages = [...this.messages, ...data]
    }

    async fetchImage(url) {
        try {
            const response = await fetch(this.API_URL_W_CHATBOT + url, {
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                }
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const blob = await response.blob();
            const imageUrl = URL.createObjectURL(blob);
            this.picture = imageUrl;
        } catch (error) {
            console.error('Error fetching image:', error);
            this.picture = null;
        }
    };

    static get observedAttributes() {
        return ['token', 'keyLocal', 'chatbotId'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'token') this.token = newValue;
        if (name === 'keyLocal') this.keyLocal = localStorage.getItem(newValue);
        if (name === 'chatbotId') this.chatbotId = newValue;
        this.initChatbot();
    }

    async render() {
        const template = await this.loadTemplate();
        this.shadowRoot.appendChild(template.content.cloneNode(true));
        const dialog = this.shadowRoot.getElementById('chatbot-dialog');
        const toggle = this.shadowRoot.getElementById('chatbot-toggle');
        const close = this.shadowRoot.getElementById('chatbot-close');
        const input = this.shadowRoot.getElementById('chatbot-input');
        const sent = this.shadowRoot.getElementById('chatbot-send');
        toggle.addEventListener('click', () => {
            if (dialog.hasAttribute('open')) {
                dialog.removeAttribute('open');
                return;
            }
            dialog.setAttribute('open', '');
            input.focus();
            this.scrollToBottom();
        });
        close.addEventListener('click', () => {
            dialog.removeAttribute('open');
        });

        const sendNewMessage = () => {
            if(this.isAnswering) return;
            this.messages = [...this.messages, { role: 'user', content: input.value }];
            input.value = '';
            this.renderMessages();
            this.sendMessage();
            this.isAnswering = true;
        };
        input.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') sendNewMessage();
        });
        sent.addEventListener('click', () => {
            sendNewMessage();
        });

        this.renderMessages();
    }

    renderMessages() {
        const messages = this.shadowRoot.getElementById('chatbot-messages');
        messages.innerHTML = '';
        this.messages.forEach((msg) => {
            const message = `<div class="chatbot-message ${msg.role}">
                ${msg.role === 'assistant' ?
                    (this.picture ? `<img src="${this.picture}" alt="Chatbot" style="width: 2.5rem; height: 2.5rem; border-radius: 50%; margin-right: .5rem;">` : '<i class="pi pi-comment"></i>')
                    : '<i class="pi pi-user"></i>'}
                <div>${msg.content}</div>
            </div>`;
            messages.innerHTML += message;
        });
        this.scrollToBottom();
    }

    scrollToBottom() {
        const messages = this.shadowRoot.getElementById('chatbot-messages');
        messages.scrollTop = messages.scrollHeight;
    }

    async loadTemplate() {
        // const response = await fetch('chatbot.html');
        // const text = await response.text();
        const text = `
        <head>
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/primeicons/primeicons.css">
            <style>
            *{
                box-sizing: border-box;
                margin: 0;
                padding: 0;
                font-family: 'Poppins', sans-serif;
                --emphasis-color: ${this.chatbotConfig?.emphasis_color || '#1a1a1a'};
                --text-color: ${this.chatbotConfig?.text_color || '#fff'};
            }

            #chatbot-toggle{
                position: fixed;
                right: 3rem;
                bottom: 2rem;
                width: 4rem;
                height: 4rem;
                background-color: var(--emphasis-color);
                color: var(--text-color);
                border: none;
                border-radius: 50%;
                cursor: pointer;
                box-shadow: 0 5px 1rem rgba(0, 0, 0, 0.1);
                i{
                    font-size: 1.6rem;
                }
                &:hover{
                    background-color: color-mix(in srgb, var(--emphasis-color), black 15%);
                }
            }

            #chatbot-dialog{
                position: fixed;
                bottom: 8rem;
                left: auto;
                right: 3rem;
                width: 30rem;
                height: 40rem;
                margin: 0;
                background-color: #fdfdfd;
                box-shadow: 0 5px 1rem rgba(0, 0, 0, 0.1);
                border: none;
                border-radius: .5rem;
                overflow: hidden;
                padding: 0;
            }

            .chatbot-header{
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1rem;
                font-size: 1.2rem;
                background: #f5f5f5;
            }

            #chatbot-close{
                background-color: transparent;
                border: none;
                color: #1a1a1a;
                font-size: inherit;
                cursor: pointer;
                &:hover{
                    color: #090909;
                }
            }

            .chatbot-footer{
                position: absolute;
                bottom: 1rem;
                width: 100%;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 1rem;
                padding: 0 1rem;
                input{
                    width: 100%;
                    padding: .5rem;
                    border: none;
                    border-radius: .5rem;
                    outline: none;
                    font-size: 1rem;
                }
                button{
                    background-color: var(--emphasis-color);
                    color: var(--text-color);
                    border: none;
                    border-radius: .5rem;
                    padding: .8rem 1rem;
                    cursor: pointer;
                    &:hover{
                        background-color: color-mix(in srgb, var(--emphasis-color), black 15%);
                    }
                }
            }

            #chatbot-messages{
                display: flex;
                flex-direction: column;
                gap: 1rem;
                overflow-y: auto;
                padding: 1rem;
                height: calc(100% - 8rem);
                overflow-y: auto;
            }

            .chatbot-message{
                display: flex;
                gap: .5rem;
                align-self: flex-start;
                align-items: flex-end;
                width: 100%;
                div{
                    padding: .5rem;
                    border-radius: .5rem;
                    background-color: #f5f5f5;
                    max-width: 70%;
                    text-wrap: balance;
                    word-wrap: break-word;
                    ul, ol{
                        padding-left: 1rem;
                    }
                }
                i.pi{
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 2.5rem;
                    height: 2.5rem;
                    background: linear-gradient(30deg, #007595, #007595, #21c7f539);
                    color: #fff;
                    font-size: 1.2rem;
                    padding: .5rem;
                    border-radius: 50%;
                }
                &.user{
                    flex-direction: row-reverse;
                    align-self: flex-end;
                    div{
                        background-color: #e7e7e7;
                    }
                    i{
                        background: #1a1a1a;
                    }
                }
            }
            </style>
        </head>
        <dialog id="chatbot-dialog">
            <header class="chatbot-header">
                <h4>${this.chatbotConfig?.name || 'Chatbot'}</h4>
                <button id="chatbot-close">
                    <i class="pi pi-times"></i>
                </button>
            </header>
            <article id="chatbot-messages">
            </article>
            <footer class="chatbot-footer">
                <input type="text" id="chatbot-input" placeholder="Escribe un mensaje..." />
                <button id="chatbot-send">
                    <i class="pi pi-send"></i>
                </button>
            </footer>
        </dialog>
        <button id="chatbot-toggle">
            <i class="pi pi-comment"></i>
        </button>
        `;
        const template = document.createElement('template');
        template.innerHTML = text;
        return template;
    }

    async sendMessage() {
        const data = this.messages.slice(-1)[0].content;

        const response = await fetch(this.API_URL_W_CHATBOT + 'api/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + this.token
            },
            body: JSON.stringify({ chatbot_id: this.chatbotId, content: data })
        });

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let result;
        let accumulatedContent = '';

        while (!(result = await reader.read()).done) {
            let chunk = decoder.decode(result.value, { stream: true });

            try {
                const parsedChunks = chunk.split('}{').map((s, i, arr) => {
                    if (arr.length > 1) {
                        if (i === 0) return s + '}';
                        if (i === arr.length - 1) return '{' + s;
                        return '{' + s + '}';
                    }
                    return s;
                });

                for (let chunk of parsedChunks) {
                    const parsedChunk = JSON.parse(chunk);
                    accumulatedContent += parsedChunk.content;

                    let lastMessage = this.messages[this.messages.length - 1];
                    if (lastMessage.role !== 'assistant') {
                        this.messages = [...this.messages, { role: 'assistant', content: accumulatedContent }];
                    } else {
                        this.messages = [...this.messages.slice(0, -1), { role: 'assistant', content: accumulatedContent }];
                    }
                    this.renderMessages();
                }
            } catch (e) {
                console.error('Error parsing chunk:', e);
                continue;
            }
        }
        this.isAnswering = false;
    }
}

window.customElements.define('w-chat-bot', WChatBot);
