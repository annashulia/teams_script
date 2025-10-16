# Page snapshot

```yaml
- generic [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - generic [ref=e4]:
      - link [ref=e5] [cursor=pointer]:
        - /url: https://slotsense.ai
        - img [ref=e7]
      - link "Sign up" [ref=e20] [cursor=pointer]:
        - /url: /auth/signup
        - button "Sign up" [ref=e21]:
          - generic [ref=e23]: Sign up
    - generic [ref=e24]:
      - paragraph [ref=e25]: Sign in
      - paragraph [ref=e26]: Get access to your account
      - generic [ref=e28]:
        - generic [ref=e29]:
          - generic [ref=e31]: Work email
          - textbox "Work email" [active] [ref=e33]:
            - /placeholder: you@example.com
          - generic [ref=e34]:
            - img [ref=e35]
            - generic [ref=e37]: Required
        - generic [ref=e38]:
          - generic [ref=e40]: Password
          - generic [ref=e41]:
            - textbox "Password" [ref=e42]:
              - /placeholder: 8+ characters
            - img [ref=e44] [cursor=pointer]
          - generic [ref=e46]:
            - img [ref=e47]
            - generic [ref=e49]: Required
        - link "Forgot password" [ref=e50] [cursor=pointer]:
          - /url: /auth/reset-password
        - button "Sign in" [ref=e51] [cursor=pointer]:
          - generic [ref=e52]: Sign in
```