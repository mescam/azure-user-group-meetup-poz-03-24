import { KubernetesCluster, KubernetesClusterKubeConfigOutputReference } from "@cdktf/provider-azurerm/lib/kubernetes-cluster";
import { HelmProvider, HelmProviderKubernetes } from "@cdktf/provider-helm/lib/provider";
import { Release, ReleaseSetListStruct } from "@cdktf/provider-helm/lib/release";
import { Fn } from "cdktf/lib/terraform-functions";
import { Construct } from "constructs/lib/construct";


export interface NordcloudAksProps {
    readonly name: string;
    readonly location: string;
    readonly rgName: string;
    readonly nodeCount: number;
    readonly nodeSize: string;

    readonly nginxEnable: boolean;
    readonly nginxValues?: ReleaseSetListStruct[];

    readonly certbotEnable: boolean;
    readonly certbotValues?: ReleaseSetListStruct[];
}

export class NordcloudAks extends Construct {
    aks: KubernetesCluster;
    nginx: Release | undefined;
    certbot: Release | undefined;

    constructor(scope: Construct, id: string, readonly props: NordcloudAksProps) {
        super(scope, id);

        // create aks
        this.aks = new KubernetesCluster(this, 'AksCluster', {
            location: this.props.location,
            name: this.props.name,
            resourceGroupName: this.props.rgName,
            defaultNodePool: {
                name: 'default',
                nodeCount: this.props.nodeCount,
                vmSize: this.props.nodeSize,
            },
            dnsPrefix: this.props.name,
            identity: {
                type: 'SystemAssigned'
            },
        });

        // helm 
        var config = this.makeKubeConfig(this.aks.kubeConfig.get(0));
        new HelmProvider(this, "helm", {
            kubernetes: config
        })

        // install nginx ingress
        if (this.props.nginxEnable) {
            this.nginx = this.installChart(
                "nginx-ingress",
                "https://kubernetes.github.io/ingress-nginx",
                "ingress-nginx",
                "4.10.0",
                "nginx-controller",
                [
                    ...this.props.nginxValues || [],
                ]
            )
        }

        // certbot enabled?
        if (this.props.certbotEnable) {
            this.certbot = this.installChart(
                "certbot",
                "https://charts.jetstack.io",
                "cert-manager",
                "1.14.4",
                "cert-manager",
                [
                    {name: "installCRDs", value: ["true"]},
                    ...this.props.certbotValues || [],
                ]
            )
        }


    }

    makeKubeConfig(config: KubernetesClusterKubeConfigOutputReference): HelmProviderKubernetes {
        // src: https://medium.com/digital-mckinsey/terraform-cdk-for-azure-6e394907b544
        return {
          host: config.host,
          clientCertificate: Fn.base64decode(config.clientCertificate),
          clientKey: Fn.base64decode(config.clientKey),
          clusterCaCertificate: Fn.base64decode(config.clusterCaCertificate),
          username: config.username,
          password: config.password
        }
    }

    installChart(name: string, repository: string, chartName: string, chartVersion: string, namespace: string, values: ReleaseSetListStruct[]): Release {
        return new Release(this, chartName, {
            name: name,
            chart: chartName,
            version: chartVersion,
            repository: repository,
            namespace: namespace,
            createNamespace: true,
            setList: values
        });
    }
}
