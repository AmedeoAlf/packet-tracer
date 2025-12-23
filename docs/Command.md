# Requisiti per il Command

Con input vuoto bisogna ottnere:

```output
hello - Prints "Hello, World!"
interfaces - Manages interfaces
l2send - Sends a raw layer 2 packet
ping - Sends an echo request
dumpState - Dumps the device internal state
arptable - Dumps the device ARP table
udp-send - Sends an UDP packet
```

- I top-level necessitano una descrizione
- Ogni argomento successivo ha una descrizione
- Premere tab dovrebbe mostrare che tipo di argomento è previsto

## Ridefinizione

```typescript
export type Command<State extends InternalState<object>> = (
  | {
    autocomplete: (state: State, past: string[]) => AutoCompleteOption[];
    validate: (state: State, past: string[]) => boolean;
    then: Command<State>;
  }
  | {
    subcommands?: Record<string, Command<State>>;
    run?: (ctx: EmulatorContext<State>) => void;
  }
) & {
  desc: string;
};
```

Adesso

```typescript
export type Command<State extends InternalState<object>> = (
  | {
    autocomplete: (state: State, past: string[]) => AutoCompleteOption[];
    validate: (state: State, past: string[]) => boolean;
    paramDesc: string;
    then: Command<State>;
  }
  | {
    subcommands?: Record<string, Command<State>>;
  }
) & {
  desc: string;
  run?: (ctx: EmulatorContext<State>) => void;
};
```

### Modifiche

- I comandi con autocomplete/validate devono specificare cosa comprende l'argomento
- Ogni argomento può specificare un run, chiamato quando l'argomento in questione
è l'ultimo
