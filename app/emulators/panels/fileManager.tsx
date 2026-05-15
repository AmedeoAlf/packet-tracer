import { OSInternalState } from "@/app/devices/list/Computer";
import { EmulatorContext } from "../DeviceEmulator";
import * as os from "../utils/osFiles";
import { TextInput } from "@/app/editorComponents/TextInput";
import { Button } from "@/app/editorComponents/RoundBtn";

export interface FileManagerPanelState extends OSInternalState<FileManagerPanelState> {
  currPath_t?: string;
  pathInput_t?: string;
  fileTextArea_t?: string;
}

export function fileManager(ctx: EmulatorContext<FileManagerPanelState>) {
  const currPath = ctx.state.currPath_t ?? "/";
  // Solo uno dei due non ritornerà un errore
  const dir = os.getDir(ctx.state.filesystem, currPath);
  const file = os.readFile(ctx.state.filesystem, currPath);
  const fileContents = os.isError(file) ? "" : file;
  return (
    <>
      <form
        method="dialog"
        onSubmit={() => {
          ctx.state.currPath_t = ctx.state.pathInput_t ?? "/";
          ctx.updateState();
        }}
        className="flex gap-2 items-stretch"
      >
        <TextInput
          value={ctx.state.pathInput_t ?? currPath}
          setValue={(path) => {
            if (!path.startsWith("/")) path = "/" + path;
            ctx.state.pathInput_t = path;
            ctx.updateState();
          }}
        />
        <Button className="bg-onsidebar self-center">Apri</Button>
      </form>
      {!os.isError(dir) ? (
        <DirListing
          directory={dir}
          isRoot={dir == ctx.state.filesystem}
          open={(dir) => {
            ctx.state.currPath_t = currPath.endsWith("/")
              ? currPath + dir
              : `${currPath}/${dir}`;
            ctx.state.pathInput_t = undefined;
            ctx.updateState();
          }}
          del={(dir) => {
            const parent = os.getDir(ctx.state.filesystem, currPath);
            if (os.isError(parent)) return;
            os.removeFile(parent, dir);
            ctx.updateState();
          }}
        />
      ) : (
        <FileEditor
          value={ctx.state.fileTextArea_t ?? fileContents}
          setValue={(contents) => {
            ctx.state.fileTextArea_t = contents;
            ctx.updateState();
          }}
          save={(contents) => {
            os.writeFileInLocation(ctx.state.filesystem, currPath, contents);
            ctx.updateState();
          }}
        />
      )}
    </>
  );
}

function DirEntry({
  open,
  del,
  value,
}: {
  open: () => void;
  del?: () => void;
  value: string;
}) {
  return (
    <div className="flex">
      <a href="#" onClick={open} className="flex-1">
        {value}
      </a>
      {del && <Button onClick={del}>🗑️</Button>}
    </div>
  );
}

function DirListing({
  isRoot,
  directory,
  open,
  del,
}: {
  isRoot: boolean;
  directory: os.OSDir;
  open: (dir: string) => void;
  del: (dir: string) => void;
}) {
  return (
    <div>
      {!isRoot && <DirEntry value=".." open={open.bind(null, "..")} />}
      {Object.keys(directory).map((it) => (
        <DirEntry
          key={it}
          value={os.isDirectory(directory[it]) ? it + "/" : it}
          open={open.bind(null, it)}
          del={del.bind(null, it)}
        />
      ))}
    </div>
  );
}

function FileEditor({
  value,
  setValue,
  save,
}: {
  value: string;
  setValue: (val: string) => void;
  save: (val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 items-center">
      <textarea
        className="w-full bg-background rounded-sm p-2 h-25"
        value={value}
        onChange={(ev) => setValue(ev.target.value)}
      />
      <Button
        onClick={() => save(value)}
        className="bg-primary hover:brightness-110"
      >
        Salva
      </Button>
    </div>
  );
}
