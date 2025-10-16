# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - alert [ref=e2]
  - generic [ref=e3]:
    - link [ref=e5] [cursor=pointer]:
      - /url: https://slotsense.ai
      - img [ref=e7]
    - generic [ref=e20]:
      - paragraph [ref=e21]: Reset your password
      - paragraph [ref=e22]: Enter your account email address, and we'll send you a link to reset your password.
      - generic [ref=e23]:
        - generic [ref=e24]:
          - generic [ref=e25]:
            - generic [ref=e27]: Work email
            - textbox "Work email" [ref=e29]:
              - /placeholder: you@example.com
          - button "Send reset link" [ref=e30] [cursor=pointer]:
            - generic [ref=e31]: Send reset link
        - button "Back to sign in" [ref=e32] [cursor=pointer]:
          - link "Back to sign in" [ref=e34]:
            - /url: /auth/signin
```