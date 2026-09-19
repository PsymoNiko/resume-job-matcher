import { GitHubProfileData } from '../types';

export const SAMPLE_PROFILES: { id: string; label: string; role: string; profile: GitHubProfileData }[] = [
  {
    id: 'fullstack-cloud',
    label: 'Alex Chen (Full-Stack & Cloud Architect)',
    role: 'Senior Full-Stack & Cloud Systems Engineer',
    profile: {
      username: 'alexchen-dev',
      name: 'Alex Chen',
      bio: 'Senior Full-Stack & Distributed Cloud Engineer. Building resilient TypeScript, Go, and cloud architectures. Open-source contributor.',
      public_repos_count: 18,
      location: 'San Francisco, CA',
      blog: 'https://alexchen.dev',
      company: 'Distributed Systems Labs',
      total_stars: 482,
      top_languages: [
        { language: 'TypeScript', bytes: 420000, percentage: 48 },
        { language: 'Go', bytes: 210000, percentage: 24 },
        { language: 'Rust', bytes: 140000, percentage: 16 },
        { language: 'Python', bytes: 105000, percentage: 12 },
      ],
      repositories: [
        {
          name: 'nexus-stream-engine',
          description: 'High-throughput event streaming engine with backpressure handling, WebSocket multiplexing, and Redis cluster caching.',
          html_url: 'https://github.com/alexchen-dev/nexus-stream-engine',
          languages: { TypeScript: 185000, Go: 95000 },
          stars: 214,
          forks: 32,
          topics: ['streaming', 'websockets', 'redis', 'distributed-systems', 'typescript'],
          readme_snippet: `# Nexus Stream Engine
A resilient, horizontally scalable real-time streaming pipeline designed for financial telemetry and live event dispatching.
Features:
- Sub-5ms event delivery across 50,000 concurrent client connections
- Dynamic backpressure mitigation using adaptive token-bucket rate limiting
- Automatic node failover with distributed Raft consensus leader election
- Prometheus metrics exporter with pre-configured Grafana operational dashboards
Benchmarks: Handles 120,000 sustained msgs/sec with p99 latency < 8ms on standard 4-core Kubernetes pods.`,
          recent_commits: [
            'feat: implement adaptive backpressure buffer with ring buffer allocation',
            'perf: reduce JSON serialization overhead using simdjson bindings',
            'chore: add helm chart and k8s auto-scaling metrics'
          ],
          updated_at: '2026-08-14T10:20:00Z'
        },
        {
          name: 'cloud-vault-auth',
          description: 'Zero-trust identity and token lifecycle service with multi-tenant RBAC, OAuth2/OIDC, and automated session revocation.',
          html_url: 'https://github.com/alexchen-dev/cloud-vault-auth',
          languages: { TypeScript: 120000, SQL: 45000 },
          stars: 168,
          forks: 21,
          topics: ['oauth2', 'oidc', 'jwt', 'security', 'zero-trust', 'postgresql'],
          readme_snippet: `# Cloud Vault Auth
Enterprise-grade microservice for identity federation, fine-grained RBAC permission trees, and cryptographic token verification.
Features:
- Compliant with OAuth2.1 and OpenID Connect specifications
- Asymmetric Ed25519 token signing with rotation without client restarts
- PostgreSQL storage with Row-Level Security (RLS) and connection pooling via PgBouncer
- Dockerized staging environment with end-to-end integration test suites in Vitest.`,
          recent_commits: [
            'feat: add audit logging for high-privilege IAM mutations',
            'security: patch constant-time string comparator for session validation',
            'test: achieve 96% unit and integration branch coverage'
          ],
          updated_at: '2026-07-28T14:15:00Z'
        },
        {
          name: 'dynamo-query-builder',
          description: 'Type-safe compile-time SQL/NoSQL query constructor with automatic migration generation for Postgres and DynamoDB.',
          html_url: 'https://github.com/alexchen-dev/dynamo-query-builder',
          languages: { TypeScript: 98000 },
          stars: 76,
          forks: 9,
          topics: ['orm', 'database', 'typescript', 'dynamodb', 'postgresql'],
          readme_snippet: `# Dynamo Query Builder
Lightweight, zero-overhead type-safe query abstraction layer providing unified syntax across relational and document stores.
Includes automated query plan analysis, connection health telemetry, and strict compile-time schema validation.`,
          recent_commits: [
            'feat: add composite key pagination helper',
            'refactor: extract AST parsing into modular compiler passes'
          ],
          updated_at: '2026-06-11T08:40:00Z'
        },
        {
          name: 'k8s-cost-watcher',
          description: 'Autonomous CLI agent and daemon calculating Kubernetes pod resource allocation inefficiencies with Slack alerts.',
          html_url: 'https://github.com/alexchen-dev/k8s-cost-watcher',
          languages: { Go: 115000 },
          stars: 24,
          forks: 4,
          topics: ['kubernetes', 'cloud-cost', 'devops', 'golang', 'cli'],
          readme_snippet: `# Kubernetes Cost Watcher
Autonomous daemon running in daemonsets to detect over-provisioned CPU and memory reservations, reducing AWS EKS cluster overhead by up to 32%.`,
          recent_commits: [
            'feat: add multi-cluster context switching',
            'docs: document webhook integration for PagerDuty and Slack'
          ],
          updated_at: '2026-05-03T17:30:00Z'
        }
      ]
    }
  },
  {
    id: 'ai-systems',
    label: 'Elena Rostova (AI & ML Platform Engineer)',
    role: 'Staff AI/ML Infrastructure & Inference Systems Engineer',
    profile: {
      username: 'erostova-ai',
      name: 'Elena Rostova',
      bio: 'Staff AI Systems Engineer. Specializing in LLM inference acceleration, CUDA kernels, vector indexing, and production agent orchestration.',
      public_repos_count: 14,
      location: 'Seattle, WA',
      blog: 'https://erostova.ai',
      company: 'TensorScale Intelligence',
      total_stars: 840,
      top_languages: [
        { language: 'Python', bytes: 560000, percentage: 62 },
        { language: 'C++', bytes: 180000, percentage: 20 },
        { language: 'CUDA', bytes: 90000, percentage: 10 },
        { language: 'TypeScript', bytes: 72000, percentage: 8 },
      ],
      repositories: [
        {
          name: 'fast-vllm-router',
          description: 'Intelligent multi-model inference load balancer and speculative decoding scheduler for vLLM & TensorRT-LLM clusters.',
          html_url: 'https://github.com/erostova-ai/fast-vllm-router',
          languages: { Python: 320000, 'C++': 80000 },
          stars: 530,
          forks: 64,
          topics: ['vllm', 'llm-inference', 'distributed-systems', 'python', 'pytorch'],
          readme_snippet: `# Fast vLLM Router
Distributed inference proxy supporting KV-cache affinity routing, speculative decoding orchestration, and continuous batching metrics.
Highlights:
- Achieved 2.8x higher throughput on mixed prefix prompts across 8x H100 GPU clusters
- Prefix-caching hit rate increased to 74% via semantic embedding bucketing
- Seamless streaming token dispatch with zero buffer stalls via AsyncIO and uvloop.`,
          recent_commits: [
            'feat: add PagedAttention v3 kernel support',
            'perf: reduce dispatch latency to < 1.2ms via C++ native router'
          ],
          updated_at: '2026-09-02T16:00:00Z'
        },
        {
          name: 'rag-vector-quantizer',
          description: 'HNSW vector index compression library with product quantization (PQ) reducing RAM footprint by 70% with 98% recall.',
          html_url: 'https://github.com/erostova-ai/rag-vector-quantizer',
          languages: { Python: 160000, 'C++': 75000, CUDA: 45000 },
          stars: 210,
          forks: 30,
          topics: ['vector-search', 'embeddings', 'quantization', 'rag', 'cuda'],
          readme_snippet: `# RAG Vector Quantizer
SIMD-accelerated and CUDA-boosted vector quantization framework for large-scale embedding search in production RAG systems.`,
          recent_commits: [
            'feat: implement AVX-512 distance calculation routines',
            'bench: compare against Milvus and Faiss with 10M vector dataset'
          ],
          updated_at: '2026-08-18T11:20:00Z'
        },
        {
          name: 'agentic-eval-harness',
          description: 'Automated benchmark suite for measuring multi-step tool-calling reliability, hallucination rate, and execution safety.',
          html_url: 'https://github.com/erostova-ai/agentic-eval-harness',
          languages: { Python: 80000, TypeScript: 72000 },
          stars: 100,
          forks: 18,
          topics: ['evals', 'ai-agents', 'benchmarks', 'llmops', 'safety'],
          readme_snippet: `# Agentic Eval Harness
Standardized framework evaluating autonomous agent execution trajectories with sandboxed Docker executors and deterministic ground-truth verification.`,
          recent_commits: [
            'feat: add SWE-bench lite evaluation workflow',
            'refactor: export structured OpenTelemetry traces for agent steps'
          ],
          updated_at: '2026-07-10T14:45:00Z'
        }
      ]
    }
  }
];

export const SAMPLE_JOB_DESCRIPTIONS: { id: string; title: string; company: string; jd: string }[] = [
  {
    id: 'senior-fullstack',
    title: 'Senior Full-Stack Platform Engineer',
    company: 'FinScale Cloud Systems',
    jd: `Title: Senior Full-Stack Platform Engineer
Company: FinScale Cloud Systems
Location: San Francisco, CA / Remote

About the Role:
We are looking for a Senior Full-Stack Platform Engineer to scale our core event streaming and multi-tenant financial application services. You will design, develop, and maintain high-throughput backend services and performant front-end monitoring interfaces.

Key Responsibilities:
- Build and maintain mission-critical distributed APIs in TypeScript and Go.
- Architect event-driven systems using Redis, WebSockets, and message queues handling 50k+ concurrent connections.
- Design resilient PostgreSQL schemas with connection pooling, migration automation, and zero-downtime deployments.
- Deploy and manage containerized services on Kubernetes (EKS/GKE), observing SLIs/SLOs with Prometheus and Grafana.
- Lead code reviews, maintain high test coverage (>85%), and mentor junior engineers on software craftsmanship and security best practices.

Requirements:
- 5+ years of experience delivering full-stack or backend web applications at scale.
- Strong mastery of TypeScript/Node.js and modern relational databases (PostgreSQL).
- Demonstrated experience in distributed systems, real-time streaming, or backpressure mitigation.
- Hands-on experience with Docker, Kubernetes, and Cloud Infrastructure (AWS or GCP).
- Familiarity with zero-trust authentication (OAuth2 / OIDC / JWT) and secure API development.
- Outstanding communication skills and an evidence-backed track record of measurable technical impact.`
  },
  {
    id: 'staff-ai-infra',
    title: 'Staff AI Infrastructure & Inference Engineer',
    company: 'HyperCognition Labs',
    jd: `Title: Staff AI Infrastructure & Inference Engineer
Company: HyperCognition Labs
Location: Seattle, WA / Hybrid

About the Role:
HyperCognition Labs is building the next-generation foundation model serving mesh. We are seeking a Staff AI Systems Engineer to lead our inference acceleration, model serving infrastructure, and multi-GPU cluster orchestration.

Key Responsibilities:
- Optimize LLM serving engines (vLLM, TensorRT-LLM, Triton) for low latency, high token throughput, and continuous batching.
- Implement KV-cache optimization, prefix caching, and speculative decoding strategies on modern GPU clusters (H100/A100).
- Develop distributed vector retrieval and Product Quantization pipelines for real-time Retrieval-Augmented Generation (RAG).
- Design automated LLM evaluation harnesses to quantify hallucination rates, tool-call accuracy, and latency regression.
- Collaborate with research teams to bring prototype architectures into production microservices with 99.95% availability.

Requirements:
- 6+ years of systems engineering experience, with 3+ years focused on deep learning infrastructure and inference pipelines.
- Deep proficiency in Python and C++, with working knowledge of CUDA kernels and GPU memory management.
- Hands-on expertise with PyTorch, distributed inference frameworks (vLLM / Ray / Triton), and vector databases.
- Strong background in Linux systems programming, networking, and asynchronous I/O architectures.
- Track record of open-source contributions or technical publications in ML systems is a major plus.`
  },
  {
    id: 'founding-engineer',
    title: 'Founding Engineer (Full-Stack + AI)',
    company: 'Synapse Automata (YC W26)',
    jd: `Title: Founding Engineer (Full-Stack & AI Orchestration)
Company: Synapse Automata
Location: San Francisco, CA

About the Role:
As Founding Engineer #2, you will own our core product end-to-end: from intuitive React user interfaces to scalable backend workflow engines and multi-agent coordination pipelines.

Key Responsibilities:
- Build the initial production architecture from the ground up using TypeScript, React, Node.js/Express, and PostgreSQL.
- Integrate LLMs and autonomous agents with tool-use, structured JSON output validation, and sandboxed code execution.
- Maintain rapid shipping velocity while upholding high standards for code quality, automated testing, and developer experience.
- Talk directly with enterprise pilot customers to rapidly iterate on feedback and eliminate UX friction.

Requirements:
- Proven experience building and launching 0-to-1 web applications or high-traction developer tools.
- Strong proficiency with modern TypeScript, React, RESTful/GraphQL APIs, and cloud services.
- Practical experience with LLM APIs (Gemini, Claude, OpenAI), prompt engineering, and structured extraction.
- Self-directed, highly proactive mindset with a bias for shipping clean, measurable solutions.`
  }
];

export const SAMPLE_URL_PRESETS = [
  {
    id: 'yc-jobs',
    label: 'YC Jobs Portal (Live Careers Directory)',
    url: 'https://news.ycombinator.com/jobs',
    type: 'careers_portal' as const,
    description: 'Searches live listings across active YC startups and indexes engineering roles.',
  },
  {
    id: 'stripe-infra',
    label: 'Stripe Systems Engineer (Single Job Spec)',
    url: 'https://stripe.com/jobs/infrastructure-systems-engineer',
    type: 'single_job' as const,
    description: 'Distributed infrastructure, high-throughput financial telemetry, and Go/TypeScript services.',
  },
  {
    id: 'github-staff',
    label: 'GitHub Platform Engineer (Single Job Spec)',
    url: 'https://github.careers/staff-platform-engineer',
    type: 'single_job' as const,
    description: 'Large-scale developer platforms, Kubernetes cluster orchestration, and resilient APIs.',
  },
];

export const SAMPLE_DOCUMENT_PRESETS = [
  {
    id: 'staff-distributed-pdf',
    fileName: 'Stripe_Staff_Distributed_Systems_Engineer_Spec.pdf',
    fileType: 'application/pdf',
    label: 'Staff Systems Engineer Spec (PDF)',
    sampleText: `Job Title: Staff Distributed Systems Engineer
Company: CloudScale Infrastructure
Location: San Francisco, CA / Remote
Employment Type: Full-Time

About the Role:
CloudScale Infrastructure is seeking a Staff Distributed Systems Engineer to architect next-generation global consensus clusters and event mesh architectures handling over 2M requests/sec.

Key Responsibilities:
- Architect distributed consensus, replication, and backpressure mechanisms using TypeScript, Go, and Redis clusters.
- Drive high-throughput, low-latency microservice interfaces with gRPC and WebSockets.
- Implement zero-trust security postures with automated token rotation and cryptographic verification.
- Mentor senior engineers on distributed systems failure modes, chaos engineering, and p99 latency optimization.

Required Qualifications & Skills:
- 7+ years of experience engineering high-concurrency distributed systems in production.
- Deep expertise in TypeScript, Go, or Rust, with practical knowledge of Redis, Kafka, and PostgreSQL.
- Proven mastery of Docker, Kubernetes, Prometheus telemetry, and AWS/GCP cloud environments.
- Strong grounding in distributed consensus (Raft/Paxos), multi-region active-active architectures, and CAP theorem trade-offs.`,
  },
  {
    id: 'lead-fullstack-txt',
    fileName: 'Vercel_Lead_FullStack_Engineer_Spec.txt',
    fileType: 'text/plain',
    label: 'Lead Full-Stack AI Engineer Spec (TXT)',
    sampleText: `Title: Lead Full-Stack AI Systems Engineer
Company: NextGen Automata
Location: New York, NY / Remote (US)
Type: Full-Time

Job Summary:
NextGen Automata builds autonomous developer agents that transform natural language and codebases into production-grade systems. We need a Lead Full-Stack Engineer to own our core orchestration pipeline and client dashboard.

Responsibilities:
- Build low-latency reactive frontends using React 19, Tailwind CSS, and WebSockets.
- Design resilient Node.js / Express backend microservices with automatic LLM retry and failover hierarchies.
- Implement structured output validation, tool calling, and anti-hallucination guardrails.
- Maintain high code coverage, automated CI/CD pipelines, and zero-downtime deployment workflows.

Requirements:
- 5+ years of software development experience with modern TypeScript, React, and Node.js.
- Strong understanding of RESTful API design, database schemas (PostgreSQL / Redis), and Docker containers.
- Experience with LLM integrations (Gemini, Claude, or OpenAI), structured prompting, and JSON validation.
- Passion for developer tools and human-in-the-loop autonomous agent workflows.`,
  },
];
