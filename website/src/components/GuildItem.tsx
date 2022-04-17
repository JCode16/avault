import { Home } from "@mui/icons-material";
import {
    Box,
    Typography,
    Link as MuiLink,
    Badge,
    styled,
    BadgeProps,
} from "@mui/material";
import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo } from "react";
import shallow from "zustand/shallow";
import { useChannelsStore } from "../../stores/useChannelsStore";
import { GuildPreview } from "../../stores/useGuildsStore";
import { useUserStore } from "../../stores/useUserStore";
import { getGuildInitials } from "../get-guild-intials";
import { hasUnread } from "../has-unread";
import { LightTooltip } from "./LightTooltip";

interface Props {
    guild?: GuildPreview;
}

const StyledBadge = styled(Badge)<BadgeProps>(({ theme }) => ({
    "& .MuiBadge-badge": {
        border: `3px solid ${theme.palette.background.paper}`,
        padding: "4px",
    },
}));

export const GuildItem: React.FC<Props> = ({ guild }) => {
    const router = useRouter();

    const channels = useChannelsStore(state => state.channels[guild?.id || ""]);

    const unread = useUserStore(
        state => Object.keys(channels || {}).map(key => state.unread[key]),
        shallow
    );

    const mentionCount = useMemo(
        () => unread.reduce((acc, curr) => acc + (curr.mentionCount ?? 0), 0),
        [unread]
    );

    const isGuildUnread = useMemo(
        () =>
            unread.some(({ lastMessageId, lastRead }) =>
                hasUnread(lastRead, lastMessageId)
            ),
        [unread]
    );

    return (
        <Link href={`/channels/${guild ? guild.id : "@me"}`} passHref>
            <MuiLink underline="none" sx={{ color: "common.white" }}>
                <LightTooltip
                    placement="right"
                    title={guild?.name || "Home"}
                    disableInteractive
                >
                    <Box sx={{ m: 1 }}>
                        <StyledBadge
                            badgeContent={mentionCount}
                            color="error"
                            overlap="circular"
                            invisible={mentionCount === 0}
                            anchorOrigin={{
                                vertical: "bottom",
                                horizontal: "right",
                            }}
                        >
                            <Box
                                sx={{
                                    bgcolor:
                                        router.query.guild === guild?.id
                                            ? "primary.dark"
                                            : "grey.900",
                                    // m: 1,
                                    borderRadius:
                                        router.query.guild === guild?.id
                                            ? 3
                                            : 10,
                                    cursor: "pointer",
                                    display: "grid",
                                    placeItems: "center",
                                    width: 48,
                                    height: 48,
                                    transition: "all 300ms ease",
                                    "&:hover": {
                                        borderRadius: 3,
                                        bgcolor: "primary.dark",
                                    },
                                    position: "relative",
                                    ":before": {
                                        content: "''",
                                        position: "absolute",
                                        width: "5px",
                                        height:
                                            router.query.guild === guild?.id
                                                ? "70%"
                                                : isGuildUnread || mentionCount
                                                ? "20%"
                                                : 0,
                                        top: "50%",
                                        left: "-8px",
                                        bgcolor: "common.white",
                                        borderRadius: "0 20px 20px 0",
                                        transform: "translateY(-50%)",
                                        transition: "height 300ms",
                                    },
                                    ":hover::before": {
                                        height:
                                            router.query.guild === guild?.id
                                                ? "70%"
                                                : "50%",
                                    },
                                }}
                            >
                                {guild ? (
                                    <Typography fontWeight="bold">
                                        {getGuildInitials(guild?.name)}
                                    </Typography>
                                ) : (
                                    <Home />
                                )}
                            </Box>
                        </StyledBadge>
                    </Box>
                </LightTooltip>
            </MuiLink>
        </Link>
    );
};
