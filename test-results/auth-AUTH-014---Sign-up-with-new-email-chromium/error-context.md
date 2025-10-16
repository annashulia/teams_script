# Page snapshot

```yaml
- generic [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - generic [ref=e4]:
      - link [ref=e5] [cursor=pointer]:
        - /url: https://slotsense.ai
        - img [ref=e7]
      - link "Sign in" [ref=e20] [cursor=pointer]:
        - /url: /auth/signin
        - button "Sign in" [ref=e21]:
          - generic [ref=e23]: Sign in
    - generic [ref=e24]:
      - paragraph [ref=e25]: Sign up
      - paragraph [ref=e26]: Get started today
      - generic [ref=e27]:
        - generic [ref=e28]:
          - generic [ref=e29]:
            - generic [ref=e31]: Work email
            - textbox "Work email" [active] [ref=e33]:
              - /placeholder: you@example.com
              - text: user@example.com
          - button "Continue" [ref=e34] [cursor=pointer]:
            - generic [ref=e35]: Continue
        - generic [ref=e36]:
          - text: By clicking Continue, you agree to our
          - link "Terms & Conditions" [ref=e37] [cursor=pointer]:
            - /url: https://slotsense.ai/terms-of-services
          - text: and
          - link "Privacy Policy" [ref=e38] [cursor=pointer]:
            - /url: https://slotsense.ai/privacy-policy
          - text: .
```