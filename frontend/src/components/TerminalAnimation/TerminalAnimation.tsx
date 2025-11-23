"use client";

import { useEffect, useState, useRef } from "react";
import styles from "./TerminalAnimation.module.css";

interface Step {
  type: "command" | "output" | "success" | "comment";
  content: string;
  delay: number;
}

const steps: Step[] = [
  { type: "comment", content: "# Add Carakube to your cluster", delay: 0 },
  { type: "command", content: "kubectl apply -f https://carakube.dev/install.yaml", delay: 800 },
  { type: "output", content: "namespace/carakube-system created", delay: 600 },
  { type: "output", content: "serviceaccount/carakube created", delay: 400 },
  { type: "output", content: "clusterrole/carakube created", delay: 400 },
  { type: "output", content: "clusterrolebinding/carakube created", delay: 400 },
  { type: "output", content: "deployment/carakube-operator created", delay: 400 },
  { type: "output", content: "service/carakube-api created", delay: 400 },
  { type: "success", content: "✓ Carakube installed successfully!", delay: 800 },
  { type: "command", content: "kubectl get pods -n carakube-system", delay: 1200 },
  {
    type: "output",
    content: "NAME                                 READY   STATUS    RESTARTS",
    delay: 600,
  },
  {
    type: "output",
    content: "carakube-operator-7d9f8b6c5d-x9k2p   1/1     Running   0",
    delay: 500,
  },
  {
    type: "success",
    content: "✓ Scanner is running. Access dashboard at http://localhost:3000",
    delay: 1000,
  },
];

export const TerminalAnimation = () => {
  const [visibleSteps, setVisibleSteps] = useState<number>(0);
  const [currentText, setCurrentText] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const terminalBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let typingTimeoutId: NodeJS.Timeout;

    if (visibleSteps < steps.length) {
      const currentStep = steps[visibleSteps];

      // For commands, type them out character by character
      if (currentStep.type === "command" && !isTyping) {
        setIsTyping(true);
        let charIndex = 0;

        const typeChar = () => {
          if (charIndex < currentStep.content.length) {
            setCurrentText(currentStep.content.slice(0, charIndex + 1));
            charIndex++;
            typingTimeoutId = setTimeout(typeChar, 30 + Math.random() * 40);
          } else {
            setIsTyping(false);
            timeoutId = setTimeout(() => {
              setVisibleSteps(visibleSteps + 1);
              setCurrentText("");
            }, currentStep.delay);
          }
        };

        timeoutId = setTimeout(typeChar, currentStep.delay);
      } else {
        // For other types, just show them
        timeoutId = setTimeout(() => {
          setVisibleSteps(visibleSteps + 1);
        }, currentStep.delay);
      }
    } else {
      // Reset animation after a pause
      timeoutId = setTimeout(() => {
        setVisibleSteps(0);
        setCurrentText("");
      }, 3000);
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(typingTimeoutId);
    };
  }, [visibleSteps, isTyping]);

  // Auto-scroll to bottom when content changes
  useEffect(() => {
    if (terminalBodyRef.current) {
      terminalBodyRef.current.scrollTop = terminalBodyRef.current.scrollHeight;
    }
  }, [visibleSteps, currentText, isTyping]);

  return (
    <div className={styles.terminal}>
      <div className={styles.terminalHeader}>
        <div className={styles.terminalButtons}>
          <span className={styles.terminalButtonRed}></span>
          <span className={styles.terminalButtonYellow}></span>
          <span className={styles.terminalButtonGreen}></span>
        </div>
        <div className={styles.terminalTitle}>
          <span>terminal</span>
          <span className={styles.terminalTitleSub}>~/kubernetes</span>
        </div>
        <div className={styles.terminalHeaderSpacer}></div>
      </div>

      <div className={styles.terminalBody} ref={terminalBodyRef}>
        {steps.slice(0, visibleSteps).map((step, index) => (
          <div key={index} className={styles.terminalLine}>
            {step.type === "command" && (
              <div className={styles.commandLine}>
                <span className={styles.prompt}>$</span>
                <span className={styles.command}>{step.content}</span>
              </div>
            )}
            {step.type === "comment" && <div className={styles.commentLine}>{step.content}</div>}
            {step.type === "output" && <div className={styles.outputLine}>{step.content}</div>}
            {step.type === "success" && <div className={styles.successLine}>{step.content}</div>}
          </div>
        ))}

        {isTyping && currentText && (
          <div className={styles.terminalLine}>
            <div className={styles.commandLine}>
              <span className={styles.prompt}>$</span>
              <span className={styles.command}>
                {currentText}
                <span className={styles.cursor}>▊</span>
              </span>
            </div>
          </div>
        )}

        {visibleSteps >= steps.length && (
          <div className={styles.terminalLine}>
            <div className={styles.commandLine}>
              <span className={styles.prompt}>$</span>
              <span className={styles.cursor}>▊</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
