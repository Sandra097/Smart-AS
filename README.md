# Microsoft Copilot Clone

A full-stack web application that replicates Microsoft Copilot's interface and functionality, powered by Azure OpenAI Service with GPT-4o model.

![Copilot Clone](./preview.png)

## Features

### Core Features
- 🤖 **AI Chat Interface** - Conversational AI powered by Azure OpenAI GPT-4o
- 💬 **Real-time Streaming** - Text appears word-by-word as it's generated
- 📝 **Markdown Support** - Rich text formatting with code syntax highlighting
- 🎤 **Voice Input** - Speech-to-text for hands-free messaging
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 💾 **Conversation History** - Auto-save and search past conversations
- 📤 **Export Conversations** - Download chats as Markdown files

### Design Features
- Clean, minimalist Microsoft-style design
- Responsive layout (mobile-friendly)
- Smooth animations and transitions
- Suggestion pills for quick prompts

### Security Features
- User authentication with NextAuth.js
- API keys secured on backend only
- Rate limiting on API endpoints
- Input validation and sanitization

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: Prisma with SQLite (easily switchable to PostgreSQL)
- **Auth**: NextAuth.js with credentials provider
- **AI**: Azure OpenAI Service (GPT-4o)
- **State Management**: Zustand

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- Azure OpenAI Service access with GPT-4o deployment

### Installation

1. **Navigate to the project directory**
   ```bash
   cd copilot-clone
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   The `.env.local` file is already configured with your Azure OpenAI credentials. Make sure to update the `NEXTAUTH_SECRET` for production:
   ```env
   AZURE_OPENAI_ENDPOINT=your-endpoint
   AZURE_OPENAI_API_KEY=your-api-key
   AZURE_OPENAI_DEPLOYMENT_NAME=your-deployment-name
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3000
   DATABASE_URL="file:./dev.db"
   ```

4. **Initialize the database**
   ```bash
   npx prisma generate
   npx prisma db push
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open in browser**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
copilot-clone/
├── prisma/
│   └── schema.prisma       # Database schema
├── src/
│   ├── app/
│   │   ├── api/            # API routes
│   │   │   ├── auth/       # Authentication endpoints
│   │   │   ├── chat/       # Chat streaming endpoint
│   │   │   └── conversations/ # Conversation CRUD
│   │   ├── auth/           # Auth pages (signin/signup)
│   │   ├── history/        # Conversation history page
│   │   ├── globals.css     # Global styles
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Main chat page
│   │   └── providers.tsx   # Context providers
│   ├── components/
│   │   ├── ChatContainer.tsx   # Message list container
│   │   ├── ChatInput.tsx       # Chat input with attachments
│   │   ├── ChatMessage.tsx     # Message bubble component
│   │   ├── ConversationList.tsx # Sidebar conversation list
│   │   ├── Footer.tsx          # Footer disclaimer
│   │   ├── Header.tsx          # Greeting header
│   │   ├── Sidebar.tsx         # Navigation sidebar
│   │   └── SuggestionPills.tsx # Quick action buttons
│   ├── lib/
│   │   ├── auth.ts          # NextAuth configuration
│   │   ├── azure-openai.ts  # Azure OpenAI client
│   │   ├── prisma.ts        # Prisma client singleton
│   │   ├── store.ts         # Zustand state management
│   │   ├── types.ts         # TypeScript types
│   │   └── utils.ts         # Utility functions
│   └── types/
│       ├── global.d.ts      # Global type declarations
│       └── next-auth.d.ts   # NextAuth type extensions
├── .env.local              # Environment variables
├── next.config.js          # Next.js configuration
├── package.json            # Dependencies
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## Usage

### Demo Mode
The application works without authentication in demo mode. Simply start chatting!

### With Authentication
1. Click "Sign up" to create an account
2. Sign in to persist conversations to the database
3. Access conversation history from the sidebar

### Voice Input
1. Click the microphone icon in the chat input
2. Speak your message
3. The transcribed text will appear in the input field

### Dark Mode
Click the moon/sun icon in the sidebar to toggle between light and dark themes.

### Export Conversations
1. Go to History page
2. Hover over a conversation
3. Click the download icon to export as Markdown

## Customization

### Changing the AI Model
Update `AZURE_OPENAI_DEPLOYMENT_NAME` in `.env.local` to use a different model.

### Modifying the System Prompt
Edit the `SYSTEM_PROMPT` in `src/lib/azure-openai.ts` to customize the AI's behavior.

### Adding New Suggestion Pills
Edit the `SUGGESTION_PILLS` array in `src/lib/types.ts`.

### Switching to PostgreSQL
1. Update the `DATABASE_URL` in `.env.local`
2. Change `provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`
3. Run `npx prisma db push`

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Docker
```bash
docker build -t copilot-clone .
docker run -p 3000:3000 copilot-clone
```

## License

MIT License - feel free to use this project for learning or building your own applications.

## Acknowledgments

- Microsoft Copilot for design inspiration
- Azure OpenAI Service for AI capabilities
- Next.js team for the amazing framework
