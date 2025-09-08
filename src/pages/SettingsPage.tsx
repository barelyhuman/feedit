import { pick, types } from "@react-native-documents/picker";
import { useNavigation } from "@react-navigation/native";
import { XMLParser } from "fast-xml-parser";
import { useCallback } from "react";
import { Alert, Linking, TouchableHighlight, View } from "react-native";
import RNFS from "react-native-fs";
import {
  Appbar,
  Button,
  Divider,
  List,
  ProgressBar,
  Text,
  useTheme,
} from "react-native-paper";
import Share from "react-native-share";
import { version } from "../../package.json";
import { useFeedStore } from "../lib/store/feed";
import { useOpmlImportStore } from "../lib/store/opmlImportStore";

const SettingsPage = () => {
  const navigation = useNavigation();
  const theme = useTheme();

  const total = useOpmlImportStore((s) => s.total);
  const imported = useOpmlImportStore((s) => s.imported);
  const isImporting = useOpmlImportStore((s) => s.isImporting);
  const error = useOpmlImportStore((s) => s.error);
  const startImport = useOpmlImportStore((s) => s.startImport);
  const updateProgress = useOpmlImportStore((s) => s.updateProgress);
  const finishImport = useOpmlImportStore((s) => s.finishImport);
  const setError = useOpmlImportStore((s) => s.setError);
  const addFeed = useFeedStore((state) => state.addFeed);
  const feeds = useFeedStore((s) => s.feeds);
  const addToFailedItems = useOpmlImportStore((s) => s.addToFailedItems);
  const failedItems = useOpmlImportStore((s) => s.failedItems);

  const handleImportOPML = useCallback(async () => {
    try {
      const result = await pick({
        type: types.allFiles,
        allowMultiSelection: false,
      });
      if (!result.length) return;
      const uri = result[0].uri;
      const response = await fetch(uri);
      const xmlText = await response.text();
      const parser = new XMLParser({
        attributeNamePrefix: "",
        ignoreAttributes: false,
        ignoreDeclaration: true,
        parseTagValue: true,
        preserveOrder: true,
        trimValues: false,
      });
      const parsedText = parser.parse(xmlText, true);
      const outlines = getOutlines(parsedText);
      startImport(outlines.length);
      let importedCount = 0;
      for (const outline of outlines) {
        const url = outline.xmlUrl;
        if (url) {
          await addFeed(url).catch((err) => {
            console.error(err);
            addToFailedItems(url);
          });
        }
        importedCount++;
        updateProgress(importedCount);
      }
      finishImport();
    } catch (e: any) {
      setError(e.message || "Failed to import OPML");
    }
  }, [
    addFeed,
    addToFailedItems,
    startImport,
    updateProgress,
    finishImport,
    setError,
  ]);

  const escapeXml = (str: string | undefined) => {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const handleExportOPML = useCallback(async () => {
    try {
      if (!feeds || feeds.length === 0) {
        Alert.alert("Export", "No feeds to export");
        return;
      }

      const headTitle = "feedit export";
      const outlines = feeds
        .map((f) => {
          const title = escapeXml(f.title || "");
          const xmlUrl = escapeXml(f.feedUrl || "");
          const htmlUrl = escapeXml(f.link || "");
          return `  <outline text="${title}" title="${title}" type="rss" xmlUrl="${xmlUrl}" htmlUrl="${htmlUrl}"/>`;
        })
        .join("\n");

      const opml =
        `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="1.0">\n<head>\n  <title>${
          escapeXml(headTitle)
        }</title>\n  <dateCreated>${
          new Date().toUTCString()
        }</dateCreated>\n</head>\n<body>\n${outlines}\n</body>\n</opml>`;

      const filename = `feedit-${Date.now()}.opml`;
      const path = `${RNFS.TemporaryDirectoryPath}/${filename}`;

      await RNFS.writeFile(path, opml, "utf8");
      await Share.open({
        url: `file://${path}`,
        type: "text/xml",
        filename,
      }).catch((err) => {
        if (String(err).includes("User did not share")) {
          return;
        }
        console.error("failed to share", err);
      });
    } catch (err: any) {
      console.error("failed to share", err);
    }
  }, [feeds]);

  return (
    <View>
      <Appbar.Header>
        <Appbar.BackAction
          onPress={() => {
            navigation.navigate({ name: "Home" });
          }}
        />
        <Appbar.Content title={"Settings"} />
      </Appbar.Header>
      <View>
        <View style={{ margin: 20, marginBottom: 30 }}>
          <Text variant="displaySmall" style={{ marginBottom: 16 }}>
            Import / Export
          </Text>
          {isImporting && (
            <View style={{ marginTop: 16, marginBottom: 16 }}>
              <Text>
                Importing {imported} of {total} feeds...
              </Text>
              <ProgressBar
                progress={total ? imported / total : 0}
                style={{ marginTop: 8 }}
              />
            </View>
          )}
          <Button
            mode="contained"
            onPress={handleImportOPML}
            disabled={isImporting}
          >
            Import Feeds from OPML
          </Button>
          <Button
            mode="outlined"
            onPress={handleExportOPML}
            disabled={isImporting}
            style={{ marginTop: 12 }}
          >
            Export Feeds as OPML
          </Button>
          {error && (
            <Text style={{ color: theme.colors.error, marginTop: 16 }}>
              {error}
            </Text>
          )}
          {!isImporting && failedItems.length > 0
            ? (
              <>
                <Text style={{ color: theme.colors.error, marginTop: 16 }}>
                  The following failed to import
                </Text>
                <View>
                  {failedItems.map((d) => {
                    return <List.Item title={d} />;
                  })}
                </View>
              </>
            )
            : null}
        </View>
        <Divider />
        <View
          style={{
            margin: 20,
            marginBottom: 30,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ color: theme.colors.secondary }}>
            App Version: {version}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text>Made by{" "}</Text>
            <TouchableHighlight
              style={{
                margin: 0,
                padding: 0,
              }}
              onPress={() => {
                Linking.openURL("https://reaper.is");
              }}
            >
              <Text style={{ color: theme.colors.primary }}>reaper</Text>
            </TouchableHighlight>
          </View>
        </View>
      </View>
    </View>
  );
};

export default SettingsPage;

const getOutlines = (xml: any[]) => {
  const outlines: { xmlUrl: string }[] = [];
  xml.forEach((xmlNode) => {
    const opmlNodes = xmlNode.opml || [];
    opmlNodes.forEach((opmlNode: { body?: any[] }) => {
      const body = opmlNode.body || [];
      body.forEach((bodyNode) => {
        if ("outline" in bodyNode) {
          const allAttrKeys = Object.keys(bodyNode[":@"]);
          const outline = Object.fromEntries(
            allAttrKeys.map((d) => {
              return [d, bodyNode[":@"][d]];
            }),
          );
          outlines.push(outline);
        }
      });
    });
  });
  return outlines;
};
