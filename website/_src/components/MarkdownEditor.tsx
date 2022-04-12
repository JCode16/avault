import "../prism";
import React, { useState, useCallback, useMemo } from "react";
import {
    Slate,
    Editable,
    withReact,
    RenderElementProps,
    RenderLeafProps,
} from "slate-react";
import {
    Transforms,
    Text,
    createEditor,
    Descendant,
    BaseRange,
    Range,
    Element as SlateElement,
    Editor,
    Node,
} from "slate";
import { withHistory } from "slate-history";
import styled from "@emotion/styled";
import {
    IconButton,
    List,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Popper,
    Portal,
    Typography,
} from "@mui/material";
import { AddCircle, EmojiEmotions, GifRounded } from "@mui/icons-material";
import { Emoji as EmojiPicker, emojiIndex, Picker } from "emoji-mart";
import { Mention, MentionIcon, MentionTypes } from "../../types/mentions";
import {
    extraSpaces,
    syntaxTree,
} from "./markdown/parsers/parseMessageContent";
import { SingleASTNode } from "simple-markdown";
import { Emoji } from "./markdown/styles/Emoji";
import { getEmojiUrl } from "./markdown/emoji/getEmojiUrl";

const Container = styled.div`
    width: 100%;
    min-height: max-content;
    padding: 4px 16px;
    border-radius: 5px;
    background-color: #ebebeb;
    display: flex;
    justify-content: center;
    align-items: center;
`;

const MentionsSpan = styled.span`
    padding: 3px 3px 2px;
    margin: 0 1px;
    vertical-align: middle;
    display: inline-block;
    border-radius: 4px;
    background-color: #eee;
    font-size: 0.9em;
    background: #7e7eff;
    color: white;
    &:hover {
        background: #6d6dff;
    }
`;

const customEmojis = [
    {
        name: "Octocat",
        short_names: ["octocat"],
        text: "",
        emoticons: [],
        keywords: ["github"],
        imageUrl:
            "https://github.githubassets.com/images/icons/emoji/octocat.png",
        customCategory: "GitHub",
    },
];

const withMentions = (editor: Editor) => {
    const { isInline, isVoid } = editor;

    editor.isInline = element => {
        return element.type === "mentions" ? true : isInline(element);
    };

    editor.isVoid = element => {
        return element.type === "mentions" ? true : isVoid(element);
    };

    return editor;
};

const withEmoji = (editor: Editor) => {
    const { isVoid, isInline, normalizeNode } = editor;

    editor.normalizeNode = entry => {
        const [node, path] = entry;

        console.log(node);
        if (SlateElement.isElement(node)) {
            for (const [child, childPath] of Node.children(editor, path)) {
                if (SlateElement.isElement(child) && Text.isText(node)) {
                    Transforms.insertNodes(
                        editor,
                        [
                            {
                                type: "paragraph",
                                children: [{ text: "Hello World" }],
                            },
                        ],
                        { at: childPath }
                    );
                    return;
                }
            }
        }

        normalizeNode(entry);
    };

    editor.isInline = (element: any) =>
        ["link", "button", "emoji"].includes(element.type) ||
        element.emoji ||
        isInline(element);

    editor.isVoid = (element: any) =>
        element.type === "emoji" || element.emoji || isVoid(element);

    return editor;
};

// const InlineChromiumBugfix = () => (
//     <span
//         contentEditable={false}
//         style={{
//             fontSize: 0,
//         }}
//     >
//         ${String.fromCodePoint(160) /* Non-breaking space */}
//     </span>
// );

const Element: React.FC<RenderElementProps> = props => {
    const { attributes, children, element } = props;
    switch (element.type) {
        case "mentions":
            return (
                <MentionsSpan {...attributes}>
                    {MentionIcon[element.mentionType]}
                    {element.name}
                    {children}
                </MentionsSpan>
            );
        case "emoji":
            return (
                <span {...attributes}>
                    <Emoji
                        style={{
                            cursor: "text",
                        }}
                        contentEditable={false}
                        src={element.src}
                        alt={element.emoji}
                        title={element.name}
                        draggable={false}
                        big={false}
                    />
                    {children}
                </span>
            );
        default:
            return <div {...attributes}>{children}</div>;
    }
};

const insertMention = (editor: Editor, mention: Mention) => {
    const mentionNode = {
        type: "mentions" as "mentions",
        name: mention.name,
        id: mention.id,
        mentionType: mention.type,
        children: [{ text: "" }],
    };

    if (mention.type === "emoji") {
        //@ts-ignore
        insertEmoji(editor, mention.emoji);
        return;
    }

    Transforms.insertNodes(editor, mentionNode);
    Transforms.move(editor);
};

export const MarkdownEditor = () => {
    const [value, setValue] = useState<Descendant[]>([
        {
            type: "paragraph",
            children: [
                {
                    text: "**bold** *em* ||spoiler|| :rofl::rofl: `code` https://google.com Hello? https://google.com",
                },
            ],
        },
    ]);
    const [index, setIndex] = useState(0);
    const [search, setSearch] = useState<{
        type: MentionTypes;
        query: string;
    }>({ type: "emoji", query: "" });
    const [target, setTarget] = useState<Range>();

    const chars =
        search.type === "emoji"
            ? //@ts-ignore
              (
                  (emojiIndex as any).search(search.query, {
                      //@ts-ignore
                      custom: customEmojis,
                  }) || []
              ).slice(0, Math.min(10))
            : CHARACTERS.filter(c =>
                  c.toLowerCase().startsWith(search.query.toLowerCase())
              ).slice(0, 10);

    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(anchorEl ? null : event.currentTarget);
    };

    const open = Boolean(anchorEl);
    const id = open ? "simple-popper" : undefined;

    const renderLeaf = useCallback(props => <Leaf {...props} />, []);
    const renderElement = useCallback(props => <Element {...props} />, []);

    const editor = useMemo(
        () => withMentions(withEmoji(withHistory(withReact(createEditor())))),
        []
    );

    const handleSelect = (index: number) => {
        if (chars?.length > 0 && target) {
            Transforms.select(editor, target);
            insertMention(editor, {
                name:
                    search.type === "emoji"
                        ? (chars[index] as any)?.name
                        : chars[index],
                id:
                    search.type === "emoji"
                        ? (chars[index] as any)?.id
                        : chars[index],
                type: search.type,
                //@ts-ignore
                emoji: search.type === "emoji" && chars[index],
            } as any);
        }
        setTarget(undefined);
    };

    const onKeyDown = useCallback(
        event => {
            if (target) {
                switch (event.key) {
                    case "ArrowDown":
                        event.preventDefault();
                        const prevIndex =
                            index >= chars.length - 1 ? 0 : index + 1;
                        setIndex(prevIndex);
                        break;
                    case "ArrowUp":
                        event.preventDefault();
                        const nextIndex =
                            index <= 0 ? chars.length - 1 : index - 1;
                        setIndex(nextIndex);
                        break;
                    case "Tab":
                    case "Enter":
                        if (chars?.length > 0) {
                            event.preventDefault();
                            Transforms.select(editor, target);
                            insertMention(editor, {
                                name:
                                    search.type === "emoji"
                                        ? (chars[index] as any)?.name
                                        : chars[index],
                                id:
                                    search.type === "emoji"
                                        ? (chars[index] as any)?.id
                                        : chars[index],
                                type: search.type,
                                //@ts-ignore
                                emoji: search.type === "emoji" && chars[index],
                            });
                        }
                        setTarget(undefined);
                        break;
                    case "Escape":
                        event.preventDefault();
                        setTarget(undefined);
                        break;
                }
            }
        },
        [index, search, target]
    );

    const decorate = useCallback(([node, path]) => {
        const ranges: BaseRange[] = [];

        if (!Text.isText(node)) {
            return ranges;
        }

        const getLength = (token: SingleASTNode) => {
            if (token.type === "text") {
                return token.content.length;
            } else if (typeof token.content === "string") {
                return (
                    (extraSpaces[
                        token.type as keyof typeof extraSpaces
                    ] as number) + token.content.length
                );
            } else {
                return (
                    extraSpaces[token.type as keyof typeof extraSpaces] +
                    (token.content as any).reduce(
                        (l: any, t: any) => l + getLength(t),
                        0
                    )
                );
            }
        };

        const tokens = syntaxTree(node.text);
        let start = 0;

        for (const token of tokens) {
            const length = getLength(token);
            const end = start + length;

            // if (token.type === "emoji") {
            //     Transforms.insertFragment(
            //         editor,
            //         [
            //             {
            //                 type: "emoji",
            //                 id: token.name,
            //                 src: token.src,
            //                 name: token.name,
            //                 emoji: token.emoji,
            //                 children: [{ text: "" }],
            //             },
            //         ],
            //         {
            //             at: {
            //                 anchor: { path, offset: start },
            //                 focus: { path, offset: end },
            //             },
            //         }
            //     );
            // }
            if (token.type !== "text") {
                ranges.push({
                    [token.type]: true,
                    anchor: { path, offset: start },
                    focus: { path, offset: end },
                });
            }

            start = end;
        }

        return ranges;
    }, []);

    return (
        <div
            style={{
                width: "100%",
                height: "100vh",
                padding: "20px",
                position: "relative",
            }}
        >
            <Slate
                editor={editor}
                value={value}
                onChange={value => {
                    setValue(value);
                    const { selection } = editor;

                    if (selection && Range.isCollapsed(selection)) {
                        const [start] = Range.edges(selection);
                        const wordBefore = Editor.before(editor, start, {
                            unit: "word",
                        });
                        const before =
                            wordBefore && Editor.before(editor, wordBefore);
                        const beforeRange =
                            before && Editor.range(editor, before, start);
                        const beforeText =
                            beforeRange && Editor.string(editor, beforeRange);
                        let beforeMatch: null | {
                            type: MentionTypes;
                            query: string;
                        } = null;
                        if (beforeText) {
                            if (beforeText === "@everyone") {
                                Transforms.select(editor, beforeRange);
                                insertMention(editor, {
                                    name: "@everyone",
                                    id: "@everyone",
                                    type: "@everyone",
                                });
                                setTarget(undefined);
                                return;
                            }
                            let match = beforeText.match(/^(@|#|:)(\w+)/);
                            if (match && match[1] === "@") {
                                beforeMatch = {
                                    type: "user",
                                    query: match[2],
                                };
                            } else if (match && match[1] === "#") {
                                beforeMatch = {
                                    type: "channel",
                                    query: match[2],
                                };
                            } else if (match && match[1] === ":") {
                                beforeMatch = {
                                    type: "emoji",
                                    query: match[2],
                                };
                            }
                        }
                        const after = Editor.after(editor, start);
                        const afterRange = Editor.range(editor, start, after);
                        const afterText = Editor.string(editor, afterRange);
                        const afterMatch = afterText.match(/^(\s|$)/);

                        if (beforeMatch && afterMatch) {
                            setTarget(beforeRange);
                            setSearch(beforeMatch);
                            setIndex(0);
                            return;
                        }
                    }

                    setTarget(undefined);
                }}
            >
                {target && chars && chars.length > 0 && (
                    <Portal>
                        <div
                            style={{
                                bottom: "0",
                                left: "0",
                                right: "0",
                                position: "absolute",
                                zIndex: 1,
                                padding: "3px",
                                background: "white",
                                borderRadius: "4px",
                                boxShadow: "0 1px 5px rgba(0,0,0,.2)",
                            }}
                        >
                            {search.type === "emoji" ? (
                                <List
                                    sx={{
                                        maxHeight: "100vh",
                                    }}
                                    dense
                                >
                                    {chars.map((emoji: any, i: any) => (
                                        <ListItemButton
                                            key={i}
                                            onClick={() => handleSelect(i)}
                                            selected={i == index}
                                        >
                                            <ListItemIcon>
                                                {emoji.custom ? (
                                                    <span
                                                        style={{
                                                            display:
                                                                "inline-block",
                                                            objectFit:
                                                                "contain",
                                                            verticalAlign:
                                                                "middle",
                                                        }}
                                                    >
                                                        <img
                                                            className="emoji"
                                                            alt={`:${emoji.name}:`}
                                                            src={emoji.imageUrl}
                                                        />
                                                    </span>
                                                ) : (
                                                    <EmojiPicker
                                                        set="twitter"
                                                        emoji={emoji}
                                                        size={22}
                                                    />
                                                )}
                                            </ListItemIcon>
                                            <ListItemText
                                                primary={
                                                    <Typography>
                                                        :{emoji.id}:
                                                    </Typography>
                                                }
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            ) : (
                                <List dense>
                                    {chars.map((char: any, i: any) => (
                                        <ListItemButton
                                            onClick={() => handleSelect(i)}
                                            key={char}
                                        >
                                            {char}
                                        </ListItemButton>
                                    ))}
                                </List>
                            )}
                        </div>
                    </Portal>
                )}
                <Container>
                    <IconButton>
                        <AddCircle />
                    </IconButton>
                    <Editable
                        style={{
                            width: "100%",
                            height: "100%",
                            fontSize: "1rem",
                            lineHeight: "1.375rem",
                        }}
                        decorate={decorate}
                        renderLeaf={renderLeaf}
                        renderElement={renderElement}
                        onKeyDown={onKeyDown}
                        placeholder="Message #general"
                    />
                    <IconButton>
                        <GifRounded />
                    </IconButton>
                    <IconButton onClick={handleClick}>
                        <EmojiEmotions />
                    </IconButton>
                </Container>
            </Slate>
            <Popper id={id} open={open} anchorEl={anchorEl}>
                <Picker
                    set="twitter"
                    title=""
                    emojiTooltip
                    custom={customEmojis}
                    onSelect={emoji => {
                        Transforms.insertText(editor, (emoji as any).native);
                        setAnchorEl(null);
                    }}
                />
            </Popper>
        </div>
    );
};

const Leaf: React.FC<RenderLeafProps> = ({ attributes, children, leaf }) => {
    if (leaf.strong) {
        return <strong {...attributes}>{children}</strong>;
    }
    if (leaf.emphasis) {
        return <em {...attributes}>{children}</em>;
    }

    if (leaf.url) {
        return (
            <span
                style={{ color: "blue", textDecoration: "underline" }}
                {...attributes}
            >
                {children}
            </span>
        );
    }

    if (leaf.inlineCode) {
        return (
            <code
                style={{ background: "grey", borderRadius: "3px" }}
                {...attributes}
            >
                {children}
            </code>
        );
    }

    if (leaf.emoji) {
        let emojiStr = getEmojiUrl((leaf as any).emoji);

        return (
            <span {...attributes}>
                <Emoji
                    style={{
                        cursor: "text",
                    }}
                    contentEditable={false}
                    src={emojiStr}
                    alt={leaf.emoji as any}
                    draggable={false}
                    big={false}
                />
                <span style={{ display: "none" }}>{children}</span>
            </span>
        );
    }

    if (leaf.strikethrough) {
        return <del {...attributes}>{children}</del>;
    }

    if (leaf.underline) {
        return (
            <span style={{ textDecoration: "underline" }} {...attributes}>
                {children}
            </span>
        );
    }

    if (leaf.spoiler) {
        return (
            <span
                style={{
                    background: "#ccc",
                    borderRadius: "3px",
                    padding: "1px",
                }}
                {...attributes}
            >
                {children}
            </span>
        );
    }

    return <span {...attributes}>{children}</span>;
};

export default MarkdownEditor;

const CHARACTERS = [
    "Aayla Secura",
    "Adi Gallia",
    "Admiral Dodd Rancit",
    "Admiral Firmus Piett",
    "Admiral Gial Ackbar",
    "Admiral Ozzel",
    "Admiral Raddus",
    "Admiral Terrinald Screed",
    "Admiral Trench",
    "Admiral U.O. Statura",
    "Agen Kolar",
    "Agent Kallus",
    "Aiolin and Morit Astarte",
    "Aks Moe",
    "Almec",
    "Alton Kastle",
    "Amee",
    "AP-5",
    "Armitage Hux",
    "Artoo",
    "Arvel Crynyd",
    "Asajj Ventress",
    "Aurra Sing",
    "AZI-3",
    "Bala-Tik",
    "Barada",
    "Bargwill Tomder",
    "Baron Papanoida",
    "Barriss Offee",
    "Baze Malbus",
    "Bazine Netal",
    "BB-8",
    "BB-9E",
    "Ben Quadinaros",
    "Berch Teller",
    "Beru Lars",
    "Bib Fortuna",
    "Biggs Darklighter",
    "Black Krrsantan",
    "Bo-Katan Kryze",
    "Boba Fett",
    "Bobbajo",
    "Bodhi Rook",
    "Borvo the Hutt",
    "Boss Nass",
    "Bossk",
    "Breha Antilles-Organa",
    "Bren Derlin",
    "Brendol Hux",
    "BT-1",
    "C-3PO",
    "C1-10P",
    "Cad Bane",
    "Caluan Ematt",
    "Captain Gregor",
    "Captain Phasma",
    "Captain Quarsh Panaka",
    "Captain Rex",
    "Carlist Rieekan",
    "Casca Panzoro",
    "Cassian Andor",
    "Cassio Tagge",
    "Cham Syndulla",
    "Che Amanwe Papanoida",
    "Chewbacca",
    "Chi Eekway Papanoida",
    "Chief Chirpa",
    "Chirrut Îmwe",
    "Ciena Ree",
    "Cin Drallig",
    "Clegg Holdfast",
    "Cliegg Lars",
    "Coleman Kcaj",
    "Coleman Trebor",
    "Colonel Kaplan",
    "Commander Bly",
    "Commander Cody (CC-2224)",
    "Commander Fil (CC-3714)",
    "Commander Fox",
    "Commander Gree",
    "Commander Jet",
    "Commander Wolffe",
    "Conan Antonio Motti",
    "Conder Kyl",
    "Constable Zuvio",
    "Cordé",
    "Cpatain Typho",
    "Crix Madine",
    "Cut Lawquane",
    "Dak Ralter",
    "Dapp",
    "Darth Bane",
    "Darth Maul",
    "Darth Tyranus",
    "Daultay Dofine",
    "Del Meeko",
    "Delian Mors",
    "Dengar",
    "Depa Billaba",
    "Derek Klivian",
    "Dexter Jettster",
    "Dineé Ellberger",
    "DJ",
    "Doctor Aphra",
    "Doctor Evazan",
    "Dogma",
    "Dormé",
    "Dr. Cylo",
    "Droidbait",
    "Droopy McCool",
    "Dryden Vos",
    "Dud Bolt",
    "Ebe E. Endocott",
    "Echuu Shen-Jon",
    "Eeth Koth",
    "Eighth Brother",
    "Eirtaé",
    "Eli Vanto",
    "Ellé",
    "Ello Asty",
    "Embo",
    "Eneb Ray",
    "Enfys Nest",
    "EV-9D9",
    "Evaan Verlaine",
    "Even Piell",
    "Ezra Bridger",
    "Faro Argyus",
    "Feral",
    "Fifth Brother",
    "Finis Valorum",
    "Finn",
    "Fives",
    "FN-1824",
    "FN-2003",
    "Fodesinbeed Annodue",
    "Fulcrum",
    "FX-7",
    "GA-97",
    "Galen Erso",
    "Gallius Rax",
    'Garazeb "Zeb" Orrelios',
    "Gardulla the Hutt",
    "Garrick Versio",
    "Garven Dreis",
    "Gavyn Sykes",
    "Gideon Hask",
    "Gizor Dellso",
    "Gonk droid",
    "Grand Inquisitor",
    "Greeata Jendowanian",
    "Greedo",
    "Greer Sonnel",
    "Grievous",
    "Grummgar",
    "Gungi",
    "Hammerhead",
    "Han Solo",
    "Harter Kalonia",
    "Has Obbit",
    "Hera Syndulla",
    "Hevy",
    "Hondo Ohnaka",
    "Huyang",
    "Iden Versio",
    "IG-88",
    "Ima-Gun Di",
    "Inquisitors",
    "Inspector Thanoth",
    "Jabba",
    "Jacen Syndulla",
    "Jan Dodonna",
    "Jango Fett",
    "Janus Greejatus",
    "Jar Jar Binks",
    "Jas Emari",
    "Jaxxon",
    "Jek Tono Porkins",
    "Jeremoch Colton",
    "Jira",
    "Jobal Naberrie",
    "Jocasta Nu",
    "Joclad Danva",
    "Joh Yowza",
    "Jom Barell",
    "Joph Seastriker",
    "Jova Tarkin",
    "Jubnuk",
    "Jyn Erso",
    "K-2SO",
    "Kanan Jarrus",
    "Karbin",
    "Karina the Great",
    "Kes Dameron",
    "Ketsu Onyo",
    "Ki-Adi-Mundi",
    "King Katuunko",
    "Kit Fisto",
    "Kitster Banai",
    "Klaatu",
    "Klik-Klak",
    "Korr Sella",
    "Kylo Ren",
    "L3-37",
    "Lama Su",
    "Lando Calrissian",
    "Lanever Villecham",
    "Leia Organa",
    "Letta Turmond",
    "Lieutenant Kaydel Ko Connix",
    "Lieutenant Thire",
    "Lobot",
    "Logray",
    "Lok Durd",
    "Longo Two-Guns",
    "Lor San Tekka",
    "Lorth Needa",
    "Lott Dod",
    "Luke Skywalker",
    "Lumat",
    "Luminara Unduli",
    "Lux Bonteri",
    "Lyn Me",
    "Lyra Erso",
    "Mace Windu",
    "Malakili",
    "Mama the Hutt",
    "Mars Guo",
    "Mas Amedda",
    "Mawhonic",
    "Max Rebo",
    "Maximilian Veers",
    "Maz Kanata",
    "ME-8D9",
    "Meena Tills",
    "Mercurial Swift",
    "Mina Bonteri",
    "Miraj Scintel",
    "Mister Bones",
    "Mod Terrik",
    "Moden Canady",
    "Mon Mothma",
    "Moradmin Bast",
    "Moralo Eval",
    "Morley",
    "Mother Talzin",
    "Nahdar Vebb",
    "Nahdonnis Praji",
    "Nien Nunb",
    "Niima the Hutt",
    "Nines",
    "Norra Wexley",
    "Nute Gunray",
    "Nuvo Vindi",
    "Obi-Wan Kenobi",
    "Odd Ball",
    "Ody Mandrell",
    "Omi",
    "Onaconda Farr",
    "Oola",
    "OOM-9",
    "Oppo Rancisis",
    "Orn Free Taa",
    "Oro Dassyne",
    "Orrimarko",
    "Osi Sobeck",
    "Owen Lars",
    "Pablo-Jill",
    "Padmé Amidala",
    "Pagetti Rook",
    "Paige Tico",
    "Paploo",
    "Petty Officer Thanisson",
    "Pharl McQuarrie",
    "Plo Koon",
    "Po Nudo",
    "Poe Dameron",
    "Poggle the Lesser",
    "Pong Krell",
    "Pooja Naberrie",
    "PZ-4CO",
    "Quarrie",
    "Quay Tolsite",
    "Queen Apailana",
    "Queen Jamillia",
    "Queen Neeyutnee",
    "Qui-Gon Jinn",
    "Quiggold",
    "Quinlan Vos",
    "R2-D2",
    "R2-KT",
    "R3-S6",
    "R4-P17",
    "R5-D4",
    "RA-7",
    "Rabé",
    "Rako Hardeen",
    "Ransolm Casterfo",
    "Rappertunie",
    "Ratts Tyerell",
    "Raymus Antilles",
    "Ree-Yees",
    "Reeve Panzoro",
    "Rey",
    "Ric Olié",
    "Riff Tamson",
    "Riley",
    "Rinnriyin Di",
    "Rio Durant",
    "Rogue Squadron",
    "Romba",
    "Roos Tarpals",
    "Rose Tico",
    "Rotta the Hutt",
    "Rukh",
    "Rune Haako",
    "Rush Clovis",
    "Ruwee Naberrie",
    "Ryoo Naberrie",
    "Sabé",
    "Sabine Wren",
    "Saché",
    "Saelt-Marae",
    "Saesee Tiin",
    "Salacious B. Crumb",
    "San Hill",
    "Sana Starros",
    "Sarco Plank",
    "Sarkli",
    "Satine Kryze",
    "Savage Opress",
    "Sebulba",
    "Senator Organa",
    "Sergeant Kreel",
    "Seventh Sister",
    "Shaak Ti",
    "Shara Bey",
    "Shmi Skywalker",
    "Shu Mai",
    "Sidon Ithano",
    "Sifo-Dyas",
    "Sim Aloo",
    "Siniir Rath Velus",
    "Sio Bibble",
    "Sixth Brother",
    "Slowen Lo",
    "Sly Moore",
    "Snaggletooth",
    "Snap Wexley",
    "Snoke",
    "Sola Naberrie",
    "Sora Bulq",
    "Strono Tuggs",
    "Sy Snootles",
    "Tallissan Lintra",
    "Tarfful",
    "Tasu Leech",
    "Taun We",
    "TC-14",
    "Tee Watt Kaa",
    "Teebo",
    "Teedo",
    "Teemto Pagalies",
    "Temiri Blagg",
    "Tessek",
    "Tey How",
    "Thane Kyrell",
    "The Bendu",
    "The Smuggler",
    "Thrawn",
    "Tiaan Jerjerrod",
    "Tion Medon",
    "Tobias Beckett",
    "Tulon Voidgazer",
    "Tup",
    "U9-C4",
    "Unkar Plutt",
    "Val Beckett",
    "Vanden Willard",
    "Vice Admiral Amilyn Holdo",
    "Vober Dand",
    "WAC-47",
    "Wag Too",
    "Wald",
    "Walrus Man",
    "Warok",
    "Wat Tambor",
    "Watto",
    "Wedge Antilles",
    "Wes Janson",
    "Wicket W. Warrick",
    "Wilhuff Tarkin",
    "Wollivan",
    "Wuher",
    "Wullf Yularen",
    "Xamuel Lennox",
    "Yaddle",
    "Yarael Poof",
    "Yoda",
    "Zam Wesell",
    "Zev Senesca",
    "Ziro the Hutt",
    "Zuckuss",
];