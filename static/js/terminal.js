(function() {
    const terminalInput = document.getElementById('terminal-input');
    const terminalOutput = document.getElementById('terminal-output');
    
    let resumeData = null;
    
    // Load resume data
    fetch('/resume.json')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            resumeData = data;
            updateCommands();
        })
        .catch(error => {
            console.error('Failed to load resume data:', error);
            // Fallback to basic commands if resume data fails to load
            initializeFallbackCommands();
        });
    
    let commands = {
        clear: {
            action: function() {
                terminalOutput.innerHTML = '';
                return false;
            }
        },
        help: {
            response: `Available commands:
• <span class="command">about</span> - Learn about Samuel
• <span class="command">experience</span> - Work experience
• <span class="command">skills</span> - Technical skills
• <span class="command">education</span> - Education & certifications
• <span class="command">contact</span> - Get in touch
• <span class="command">company [name]</span> - Details about specific company
• <span class="command">clear</span> - Clear terminal
• <span class="command">help</span> - Show this message

Or just type a question!`
        }
    };
    
    function initializeFallbackCommands() {
        commands.about = {
            response: `<strong>Samuel Wibrow</strong>
Senior Site Reliability Engineer / Platform Engineer

Experienced SRE with 13+ years designing and operating highly available, scalable infrastructure. 
Currently focused on AWS, Kubernetes, and building internal developer platforms.

📍 Zurich, Switzerland`
        };
        
        commands.skills = {
            response: `<strong>Technical Skills:</strong>

<strong>Cloud & Infrastructure:</strong> AWS, Terraform, Kubernetes, Docker
<strong>Languages:</strong> Python, Bash, Go
<strong>CI/CD & GitOps:</strong> GitHub Actions, ArgoCD, GitLab CI
<strong>Observability:</strong> Datadog, Prometheus, EFK Stack`
        };
        
        commands.experience = {
            response: `<strong>Current Role:</strong>
Site Reliability Engineer at Tamedia (2023-Present)

Previous experience includes Platform Engineering at Dock Financial 
and Cloud Engineering at Stylight. 13+ years in IT infrastructure.`
        };
        
        commands.contact = {
            response: `<strong>Get in touch:</strong>

• GitHub: <a href="https://github.com/swibrow" target="_blank">@swibrow</a>
• LinkedIn: <a href="https://www.linkedin.com/in/samuelwibrow/" target="_blank">Samuel Wibrow</a>
• Resume: <a href="/resume.html" target="_blank">View full resume</a>`
        };
    }
    
    function updateCommands() {
        if (!resumeData) return;
        
        commands.about = {
            response: `<strong>${resumeData.basics.name}</strong>
${resumeData.basics.label}

${resumeData.basics.summary}

📍 ${resumeData.basics.location.city}, ${resumeData.basics.location.countryCode}`
        };
        
        commands.experience = {
            response: formatExperience()
        };
        
        commands.skills = {
            response: formatSkills()
        };
        
        commands.education = {
            response: formatEducation()
        };
        
        commands.contact = {
            response: formatContact()
        };
        
        // Add company-specific commands
        resumeData.work.forEach(job => {
            const companyKey = job.company.toLowerCase().replace(/\s+/g, '');
            commands[companyKey] = {
                response: formatJob(job)
            };
        });
    }
    
    function formatExperience() {
        let response = '<strong>Work Experience:</strong>\n\n';
        const recentJobs = resumeData.work.slice(0, 4);
        
        recentJobs.forEach(job => {
            const endDate = job.endDate || 'Present';
            response += `• <strong>${job.company}</strong> - ${job.position}\n`;
            response += `  ${job.startDate} to ${endDate}\n\n`;
        });
        
        response += `Type 'company [name]' for details about a specific role.`;
        return response;
    }
    
    function formatJob(job) {
        const endDate = job.endDate || 'Present';
        let response = `<strong>${job.company}</strong>\n`;
        response += `${job.position}\n`;
        response += `${job.startDate} to ${endDate}\n`;
        if (job.location) response += `📍 ${job.location}\n`;
        response += '\n';
        
        if (job.summary) {
            response += `${job.summary}\n\n`;
        }
        
        if (job.highlights && job.highlights.length > 0) {
            response += '<strong>Key Achievements:</strong>\n';
            job.highlights.forEach(highlight => {
                response += `• ${highlight}\n`;
            });
        }
        
        return response;
    }
    
    function formatSkills() {
        let response = '<strong>Technical Skills:</strong>\n\n';
        
        resumeData.skills.forEach(skillGroup => {
            response += `<strong>${skillGroup.name}:</strong>\n`;
            response += `• ${skillGroup.keywords.join(', ')}\n\n`;
        });
        
        return response;
    }
    
    function formatEducation() {
        let response = '<strong>Education:</strong>\n';
        
        resumeData.education.forEach(edu => {
            response += `• ${edu.studyType} - ${edu.area}\n`;
            response += `  ${edu.institution} (${edu.startDate}-${edu.endDate})\n\n`;
        });
        
        response += '<strong>Certifications:</strong>\n';
        resumeData.certificates.forEach(cert => {
            response += `• <a href="${cert.url}" target="_blank">${cert.name}</a> (${cert.date})\n`;
        });
        
        return response;
    }
    
    function formatContact() {
        let response = `<strong>Get in touch:</strong>\n\n`;
        
        resumeData.basics.profiles.forEach(profile => {
            response += `• ${profile.network}: <a href="${profile.url}" target="_blank">@${profile.username}</a>\n`;
        });
        
        response += `• Resume: <a href="/resume.html" target="_blank">View full resume</a>`;
        
        return response;
    }
    
    const questionHandlers = {
        'aws': () => {
            const awsExperience = resumeData.skills.find(s => s.name === 'Cloud & Infrastructure')
                .keywords.find(k => k.includes('AWS'));
            const awsJobs = resumeData.work.filter(job => 
                job.highlights && job.highlights.some(h => h.toLowerCase().includes('aws'))
            );
            return `I have ${awsExperience} experience. Recent AWS projects include migrating to EKS, implementing Karpenter for cost optimization, and building secure banking infrastructure. I use Terraform extensively for AWS infrastructure as code.`;
        },
        'kubernetes': () => {
            const k8sJobs = resumeData.work.filter(job => 
                job.highlights && job.highlights.some(h => h.toLowerCase().includes('kubernetes') || h.toLowerCase().includes('k8s'))
            );
            return `I have extensive Kubernetes experience including migrating from KOPS to EKS, implementing GitOps with ArgoCD, developing Helm charts, and managing production workloads. Currently using Karpenter for autoscaling.`;
        },
        'terraform': () => {
            return `I'm a Terraform certified professional with experience building reusable modules, managing multi-environment infrastructure, and implementing GitOps workflows. Check out the /terraform directory in this blog repo for examples!`;
        },
        'python': () => {
            return `Python is one of my primary languages. I've developed internal libraries for CloudFormation generation, automation tools, and infrastructure management scripts.`;
        },
        'experience': () => {
            const years = new Date().getFullYear() - 2010;
            return `I have ${years}+ years of experience in IT, with the last ${years - 3} years focused on Site Reliability Engineering and Platform Engineering. Currently at ${resumeData.work[0].company} as a ${resumeData.work[0].position}.`;
        },
        'current': () => {
            const current = resumeData.work[0];
            return formatJob(current);
        },
        'certifications': () => {
            return formatEducation();
        }
    };

    function addLine(command, response) {
        const commandLine = document.createElement('div');
        commandLine.className = 'terminal-line';
        commandLine.innerHTML = `<span class="terminal-prompt">${getPrompt()}</span> <span class="terminal-text">${command}</span>`;
        terminalOutput.appendChild(commandLine);

        if (response) {
            const responseLine = document.createElement('div');
            responseLine.className = 'terminal-response';
            responseLine.innerHTML = response;
            terminalOutput.appendChild(responseLine);
        }

        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    }

    function getPrompt() {
        return `${window.terminalUser || 'samuel'}@${window.terminalHostname || 'wibrow.net'}:~$`;
    }

    function processCommand(input) {
        const trimmedInput = input.trim().toLowerCase();
        const originalInput = input.trim();
        
        if (trimmedInput === '') return;

        // Check for company command
        if (trimmedInput.startsWith('company ')) {
            const companyName = trimmedInput.substring(8).replace(/\s+/g, '');
            if (commands[companyName]) {
                addLine(originalInput, commands[companyName].response);
                return;
            }
        }

        // Check exact command match
        if (commands[trimmedInput]) {
            if (commands[trimmedInput].action) {
                const showResponse = commands[trimmedInput].action();
                if (showResponse !== false) {
                    addLine(originalInput, commands[trimmedInput].response || '');
                }
            } else {
                addLine(originalInput, commands[trimmedInput].response);
            }
            return;
        }

        // Check question handlers
        if (resumeData) {
            for (const [keyword, handler] of Object.entries(questionHandlers)) {
                if (trimmedInput.includes(keyword)) {
                    try {
                        const response = handler();
                        addLine(originalInput, response);
                        return;
                    } catch (e) {
                        console.error('Error in question handler:', e);
                    }
                }
            }

            // Search through resume data for matches
            const searchResults = searchResume(trimmedInput);
            if (searchResults) {
                addLine(originalInput, searchResults);
                return;
            }
        }

        // Default response
        if (trimmedInput.includes('?') || trimmedInput.split(' ').length > 2) {
            addLine(originalInput, `I don't have a specific answer for that. Try commands like 'help', 'about', 'skills', or ask about specific technologies like AWS, Kubernetes, or Terraform.`);
        } else {
            addLine(originalInput, `Command not found: ${originalInput}. Type 'help' for available commands.`);
        }
    }

    function searchResume(query) {
        const terms = query.split(' ');
        let matches = [];

        // Search in work highlights
        resumeData.work.forEach(job => {
            if (job.highlights) {
                job.highlights.forEach(highlight => {
                    if (terms.some(term => highlight.toLowerCase().includes(term))) {
                        matches.push({
                            type: 'experience',
                            company: job.company,
                            position: job.position,
                            text: highlight
                        });
                    }
                });
            }
        });

        // Search in skills
        resumeData.skills.forEach(skillGroup => {
            skillGroup.keywords.forEach(keyword => {
                if (terms.some(term => keyword.toLowerCase().includes(term))) {
                    matches.push({
                        type: 'skill',
                        category: skillGroup.name,
                        text: keyword
                    });
                }
            });
        });

        if (matches.length > 0) {
            let response = `Found ${matches.length} match${matches.length > 1 ? 'es' : ''} for "${query}":\n\n`;
            
            // Group by type
            const experienceMatches = matches.filter(m => m.type === 'experience');
            const skillMatches = matches.filter(m => m.type === 'skill');
            
            if (skillMatches.length > 0) {
                response += '<strong>Skills:</strong>\n';
                const uniqueSkills = [...new Set(skillMatches.map(m => m.text))];
                uniqueSkills.forEach(skill => {
                    response += `• ${skill}\n`;
                });
                response += '\n';
            }
            
            if (experienceMatches.length > 0) {
                response += '<strong>Related Experience:</strong>\n';
                experienceMatches.slice(0, 3).forEach(match => {
                    response += `• ${match.text}\n  (${match.company} - ${match.position})\n\n`;
                });
            }
            
            return response;
        }
        
        return null;
    }

    terminalInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const command = this.value;
            processCommand(command);
            this.value = '';
        }
    });

    document.querySelector('.terminal-control.close')?.addEventListener('click', function() {
        document.querySelector('.terminal-container').style.display = 'none';
    });

    document.querySelector('.terminal-control.minimize')?.addEventListener('click', function() {
        document.querySelector('.terminal-body').style.display = 'none';
    });

    document.querySelector('.terminal-control.maximize')?.addEventListener('click', function() {
        document.querySelector('.terminal-body').style.display = 'block';
    });

    terminalInput.focus();
})();