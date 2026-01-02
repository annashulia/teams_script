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
            - text: nonexistent+1767351845406@example.com
        - generic [ref=e34]:
          - generic [ref=e36]: Password
          - generic [ref=e37]:
            - textbox "Password" [ref=e38]:
              - /placeholder: 8+ characters
              - text: Passw0rd!
            - img [ref=e40] [cursor=pointer]
        - link "Forgot password" [ref=e42] [cursor=pointer]:
          - /url: /auth/reset-password
        - button "Sign in" [ref=e43] [cursor=pointer]:
          - generic [ref=e44]: Sign in
```