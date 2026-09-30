# Design findings

Existing engine calls are shared. Divergence originates in duplicated mapping, Solo rebuilding options and multiplayer finalization omitting them. Pimp's fixed constraints were explicit in 010; the user selected adaptive draft construction on 2026-09-30. Reuse the engines directly; extract only catalog knowledge, not an application-wide abstraction. No external research is needed for repository-specific facts.
