const RX_IP4 = /^((25[0-5]|(2[0-4]|1[0-9]|[1-9]|)[0-9])(\.(?!$)|$)){4}$/;

export default function isValidIP(strIP) {
    return RX_IP4.test(strIP);
}
