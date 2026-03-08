import SectionHeading from "@components/layout/SectionHeading";
import Markdown from "@components/ui/Markdown";
import Card from "@components/ui/Card";
import { motion } from "framer-motion";

const aboutContent = `SRE at Tamedia in Zurich. I build platforms and keep things running, mostly with AWS, Kubernetes, and Terraform.

Moved from Australia to Munich in 2015, then to Switzerland in 2023 for the mountains and the Raclette. Worked my way through sysadmin, cloud engineering, and platform teams along the way.

Outside of work I'm either cycling, snowboarding, or starting side projects I'll never finish.

![Samuel Wibrow](/me.jpg)`;

const skills = [
  { category: "Platform & Orchestration", items: ["Kubernetes", "AWS EKS", "Karpenter", "Helm", "Kustomize", "Kubebuilder", "Talos"] },
  { category: "Cloud & Infrastructure", items: ["AWS (10+ years)", "Terraform", "Terragrunt", "CloudFormation", "CDK"] },
  { category: "AI & Automation", items: ["Claude / Anthropic", "OpenAI / ChatGPT", "Ollama", "LLM Tooling", "AI-Assisted Dev"] },
  { category: "Observability", items: ["Datadog", "Prometheus Stack", "LGTM Stack", "EFK Stack"] },
  { category: "Languages", items: ["Go", "Python", "TypeScript", "Bash", "React"] },
  { category: "CI/CD & GitOps", items: ["GitHub Actions", "GitLab CI", "ArgoCD", "Flux", "Renovate"] },
  { category: "Networking & Security", items: ["TCP/IP", "DNS", "VPN", "OAuth2/OIDC", "Vault"] },
  { category: "Tools", items: ["Git", "Linux", "Docker", "Neovim", "CNCF Ecosystem"] },
];

export default function About() {
  return (
    <SectionHeading title="about">
      <Markdown content={aboutContent} />

      <div className="mt-12">
        <h2 className="mb-6 font-mono text-xl font-bold" style={{ color: "var(--ctp-green)" }}>
          ~/skills
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((group, i) => (
            <motion.div
              key={group.category}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
            >
              <Card>
                <h3 className="mb-2 font-mono text-sm font-bold" style={{ color: "var(--ctp-blue)" }}>
                  {group.category}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {group.items.map((item) => (
                    <span
                      key={item}
                      className="rounded px-2 py-0.5 font-mono text-xs"
                      style={{ backgroundColor: "var(--ctp-surface0)", color: "var(--ctp-text)" }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionHeading>
  );
}
